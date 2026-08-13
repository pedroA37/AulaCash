const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../config/db');
const { generarAliasUnico, generarCBUUnico } = require('../services/generadores');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  const { rows } = await pool.query(
    'SELECT id, nombre, apellido FROM usuarios WHERE email = $1', [email]
  );
  // Respuesta genérica para no filtrar si el email existe
  if (rows.length === 0) {
    return res.json({ mensaje: 'Si el email existe, recibirás un enlace de recuperación' });
  }

  const { id: usuarioId, nombre, apellido } = rows[0];
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  const { rows: tokenRows } = await pool.query(
    `INSERT INTO password_resets (usuario_id, expires_at)
     VALUES ($1, $2) RETURNING token`,
    [usuarioId, expiresAt]
  );

  const token = tokenRows[0].token;
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  if (process.env.N8N_FORGOT_PASSWORD_WEBHOOK) {
    fetch(process.env.N8N_FORGOT_PASSWORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, apellido, link }),
    }).catch(() => {});
  }

  res.json({ mensaje: 'Si el email existe, recibirás un enlace de recuperación' });
}

async function resetPassword(req, res) {
  const { token, nuevaPassword } = req.body;
  if (!token || !nuevaPassword) {
    return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });
  }
  if (nuevaPassword.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const { rows } = await pool.query(
    `SELECT pr.*, u.email, u.nombre, u.apellido
     FROM password_resets pr
     JOIN usuarios u ON u.id = pr.usuario_id
     WHERE pr.token = $1 AND pr.usado = false AND pr.expires_at > now()`,
    [token]
  );
  if (rows.length === 0) {
    return res.status(400).json({ error: 'Token inválido o expirado' });
  }

  const reset = rows[0];
  const hash = await bcrypt.hash(nuevaPassword, 12);

  await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, reset.usuario_id]);
  await pool.query('UPDATE password_resets SET usado = true WHERE id = $1', [reset.id]);

  if (process.env.N8N_CAMBIO_PASSWORD_WEBHOOK) {
    fetch(process.env.N8N_CAMBIO_PASSWORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: reset.email, nombre: reset.nombre, apellido: reset.apellido }),
    }).catch(() => {});
  }

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

module.exports = { registro, login, forgotPassword, resetPassword, cambiarPassword };
