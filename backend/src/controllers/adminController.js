const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generarAliasUnico, generarCBUUnico } = require('../services/generadores');

async function listarUsuarios(req, res) {
  const { q } = req.query;
  let query = `SELECT id, dni, email, nombre, apellido, alias, cbu, rol, created_at FROM usuarios`;
  const params = [];

  if (q) {
    query += ` WHERE nombre ILIKE $1 OR apellido ILIKE $1 OR email ILIKE $1 OR dni ILIKE $1 OR alias ILIKE $1`;
    params.push(`%${q}%`);
  }

  query += ' ORDER BY created_at DESC';

  const { rows } = await pool.query(query, params);
  res.json(rows);
}

async function getUsuario(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT id, dni, email, nombre, apellido, alias, cbu, rol, created_at
     FROM usuarios WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
}

async function getMercadosUsuario(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT m.id, m.nombre, m.estado, mu.saldo,
            mo.acronimo AS moneda_acronimo, mo.nombre AS moneda_nombre
     FROM mercado_usuarios mu
     JOIN mercados m ON m.id = mu.mercado_id
     JOIN monedas mo ON mo.id = m.moneda_id
     WHERE mu.usuario_id = $1
     ORDER BY m.nombre`,
    [id]
  );
  res.json(rows);
}

async function getTransaccionesUsuario(req, res) {
  const { id } = req.params;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT mt.*,
         uo.nombre AS origen_nombre, uo.apellido AS origen_apellido,
         ud.nombre AS destino_nombre, ud.apellido AS destino_apellido,
         m.nombre AS mercado_nombre,
         mo.acronimo AS moneda_acronimo
       FROM mercado_transacciones mt
       LEFT JOIN usuarios uo ON uo.id = mt.usuario_origen_id
       JOIN usuarios ud ON ud.id = mt.usuario_destino_id
       JOIN mercados m ON m.id = mt.mercado_id
       JOIN monedas mo ON mo.id = m.moneda_id
       WHERE mt.usuario_origen_id = $1 OR mt.usuario_destino_id = $1
       ORDER BY mt.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM mercado_transacciones
       WHERE usuario_origen_id = $1 OR usuario_destino_id = $1`,
      [id]
    ),
  ]);

  const total = parseInt(countRows[0].count);
  res.json({ data: rows, total, page, totalPages: Math.ceil(total / limit), limit });
}

async function cargarSaldo(req, res) {
  const { usuario_id, mercado_id, monto, descripcion } = req.body;
  if (!usuario_id || !mercado_id || !monto) {
    return res.status(400).json({ error: 'usuario_id, mercado_id y monto son requeridos' });
  }

  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: 'Monto inválido' });
  }

  const { rows: [mercado] } = await pool.query('SELECT admin_id FROM mercados WHERE id = $1', [mercado_id]);
  if (!mercado) return res.status(404).json({ error: 'Mercado no encontrado' });
  if (mercado.admin_id !== req.user.id) return res.status(403).json({ error: 'No sos el administrador de este mercado' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [mu] } = await client.query(
      'SELECT id FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2 FOR UPDATE',
      [mercado_id, usuario_id]
    );
    if (!mu) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'El usuario no participa en ese mercado' });
    }

    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo + $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [montoNum, mercado_id, usuario_id]
    );

    const { rows: [tx] } = await client.query(
      `INSERT INTO mercado_transacciones (mercado_id, tipo, usuario_origen_id, usuario_destino_id, monto, descripcion)
       VALUES ($1, 'carga', NULL, $2, $3, $4)
       RETURNING *`,
      [mercado_id, usuario_id, montoNum, descripcion || 'Carga de saldo por administrador']
    );

    await client.query('COMMIT');
    res.status(201).json({ transaccion: tx });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function eliminarUsuario(req, res) {
  const { id } = req.params;
  const adminId = req.user.id;

  if (parseInt(id) === adminId) {
    return res.status(400).json({ error: 'No podés eliminar tu propia cuenta' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT id, rol FROM usuarios WHERE id = $1', [id]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await client.query('DELETE FROM password_resets WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM codigos_qr WHERE usuario_emisor_id = $1', [id]);
    await client.query('DELETE FROM mercado_transacciones WHERE usuario_origen_id = $1 OR usuario_destino_id = $1', [id]);
    await client.query('DELETE FROM mercado_usuarios WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM usuarios WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function cambiarRol(req, res) {
  const { id } = req.params;
  const { rol } = req.body;
  const adminId = req.user.id;

  if (!['user', 'admin'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido. Debe ser "user" o "admin"' });
  }
  if (parseInt(id) === adminId) {
    return res.status(400).json({ error: 'No podés cambiar tu propio rol' });
  }

  const { rows } = await pool.query(
    'UPDATE usuarios SET rol = $1 WHERE id = $2 RETURNING id, nombre, apellido, email, rol',
    [rol, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
}

async function crearAdmin(req, res) {
  const { dni, email, password, nombre, apellido } = req.body;
  if (!dni || !email || !password || !nombre || !apellido) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const { rowCount: dniExiste } = await pool.query('SELECT 1 FROM usuarios WHERE dni = $1', [dni]);
  if (dniExiste > 0) return res.status(409).json({ error: 'El DNI ya está registrado' });

  const { rowCount: emailExiste } = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
  if (emailExiste > 0) return res.status(409).json({ error: 'El email ya está registrado' });

  const hash = await bcrypt.hash(password, 12);
  const alias = await generarAliasUnico();
  const cbu = await generarCBUUnico();

  const { rows } = await pool.query(
    `INSERT INTO usuarios (dni, email, password_hash, nombre, apellido, rol, alias, cbu)
     VALUES ($1, $2, $3, $4, $5, 'admin', $6, $7)
     RETURNING id, dni, email, nombre, apellido, alias, cbu, rol, created_at`,
    [dni, email, hash, nombre, apellido, alias, cbu]
  );
  res.status(201).json(rows[0]);
}

module.exports = {
  listarUsuarios, getUsuario, getMercadosUsuario,
  getTransaccionesUsuario, cargarSaldo,
  eliminarUsuario, cambiarRol, crearAdmin,
};
