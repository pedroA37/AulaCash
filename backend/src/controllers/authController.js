const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../config/db');
const { generarAliasUnico, generarCBUUnico } = require('../services/generadores');

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function registro(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const { dni, email, password, nombre, apellido } = req.body;
  const rolFinal = 'user';

  const { rowCount: dniExiste } = await pool.query(
    'SELECT 1 FROM usuarios WHERE dni = $1', [dni]
  );
  if (dniExiste > 0) {
    return res.status(409).json({ error: 'El DNI ya está registrado' });
  }

  const { rowCount: emailExiste } = await pool.query(
    'SELECT 1 FROM usuarios WHERE email = $1', [email]
  );
  if (emailExiste > 0) {
    return res.status(409).json({ error: 'El email ya está registrado' });
  }

  const hash = await bcrypt.hash(password, 12);
  const alias = await generarAliasUnico();
  const cbu = await generarCBUUnico();

  const { rows } = await pool.query(
    `INSERT INTO usuarios (dni, email, password_hash, nombre, apellido, alias, cbu, rol)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, dni, email, nombre, apellido, alias, cbu, rol, created_at`,
    [dni, email, hash, nombre, apellido, alias, cbu, rolFinal]
  );

  const usuario = rows[0];
  const token = generarToken(usuario);

  res.status(201).json({ token, usuario });
}

async function login(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const { email, password } = req.body;

  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE email = $1', [email]
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const usuario = rows[0];
  const passwordOk = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = generarToken(usuario);
  const { password_hash, ...usuarioSinHash } = usuario;

  res.json({ token, usuario: usuarioSinHash });
}

async function resetPassword(req, res) {
  const { email, dni, nuevaPassword } = req.body;
  if (!email || !dni || !nuevaPassword) {
    return res.status(400).json({ error: 'Email, DNI y nueva contraseña son requeridos' });
  }
  if (nuevaPassword.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const { rows } = await pool.query(
    'SELECT id FROM usuarios WHERE email = $1 AND dni = $2',
    [email.toLowerCase().trim(), dni.trim()]
  );
  if (rows.length === 0) {
    return res.status(400).json({ error: 'Los datos ingresados no coinciden con ninguna cuenta' });
  }

  const hash = await bcrypt.hash(nuevaPassword, 12);
  await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, rows[0].id]);

  res.json({ mensaje: 'Contraseña actualizada correctamente' });
}

async function cambiarPassword(req, res) {
  const { passwordActual, nuevaPassword } = req.body;
  if (!passwordActual || !nuevaPassword) {
    return res.status(400).json({ error: 'Contraseña actual y nueva requeridas' });
  }
  if (nuevaPassword.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.user.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

  const usuario = rows[0];
  const passwordOk = await bcrypt.compare(passwordActual, usuario.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
  }

  const hash = await bcrypt.hash(nuevaPassword, 12);
  await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, usuario.id]);

  if (process.env.N8N_CAMBIO_PASSWORD_WEBHOOK) {
    fetch(process.env.N8N_CAMBIO_PASSWORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: usuario.email, nombre: usuario.nombre, apellido: usuario.apellido }),
    }).catch(() => {});
  }

  res.json({ mensaje: 'Contraseña actualizada correctamente' });
}

module.exports = { registro, login, resetPassword, cambiarPassword };
