const pool = require('../config/db');

async function infoPorCodigo(req, res) {
  const { codigo } = req.params;
  const { rows: [m] } = await pool.query(
    `SELECT m.id, m.nombre, m.logo_url, m.estado, m.hora_cierre,
       mo.id AS moneda_id, mo.nombre AS moneda_nombre, mo.acronimo AS moneda_acronimo,
       u.nombre AS admin_nombre, u.apellido AS admin_apellido,
       (SELECT COUNT(*) FROM mercado_usuarios mu WHERE mu.mercado_id = m.id) AS total_participantes
     FROM mercados m
     JOIN monedas mo ON mo.id = m.moneda_id
     JOIN usuarios u ON u.id = m.admin_id
     WHERE m.codigo = $1`,
    [codigo.toUpperCase()]
  );
  if (!m) return res.status(404).json({ error: 'Mercado no encontrado' });
  res.json(m);
}

async function unirseAlMercado(req, res) {
  const { codigo } = req.body;
  if (!codigo) return res.status(400).json({ error: 'El código es requerido' });

  const { rows: [m] } = await pool.query(
    'SELECT id, estado, nombre FROM mercados WHERE codigo = $1',
    [codigo.toUpperCase().trim()]
  );
  if (!m) return res.status(404).json({ error: 'Código de mercado inválido' });

  try {
    await pool.query(
      'INSERT INTO mercado_usuarios (mercado_id, usuario_id) VALUES ($1, $2)',
      [m.id, req.user.id]
    );
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya participás en este mercado' });
    throw err;
  }

  res.status(201).json({ mensaje: `Te uniste al mercado "${m.nombre}"`, mercado_id: m.id });
}

async function misMercados(req, res) {
  const { rows } = await pool.query(
    `SELECT m.id, m.nombre, m.logo_url, m.estado, m.hora_cierre, m.notificacion_30_enviada, m.admin_id,
       mo.id AS moneda_id, mo.nombre AS moneda_nombre, mo.acronimo AS moneda_acronimo,
       mu.saldo
     FROM mercados m
     JOIN monedas mo ON mo.id = m.moneda_id
     JOIN mercado_usuarios mu ON mu.mercado_id = m.id
     WHERE mu.usuario_id = $1
     ORDER BY m.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

async function getMercado(req, res) {
  const { id } = req.params;
  const { rows: [m] } = await pool.query(
    `SELECT m.id, m.nombre, m.logo_url, m.estado, m.hora_cierre, m.hora_inicio,
       m.notificacion_30_enviada, m.admin_id, m.codigo,
       mo.id AS moneda_id, mo.nombre AS moneda_nombre, mo.acronimo AS moneda_acronimo,
       mu.saldo AS mi_saldo,
       u.nombre AS admin_nombre, u.apellido AS admin_apellido,
       EXISTS(SELECT 1 FROM mercado_pseudo_admins pa WHERE pa.mercado_id = m.id AND pa.usuario_id = $2) AS es_pseudo_admin
     FROM mercados m
     JOIN monedas mo ON mo.id = m.moneda_id
     JOIN mercado_usuarios mu ON mu.mercado_id = m.id AND mu.usuario_id = $2
     JOIN usuarios u ON u.id = m.admin_id
     WHERE m.id = $1`,
    [id, req.user.id]
  );
  if (!m) return res.status(404).json({ error: 'Mercado no encontrado o no participás' });
  res.json(m);
}

async function getParticipantes(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT mu.usuario_id, mu.saldo, mu.joined_at,
       u.nombre, u.apellido, u.alias
     FROM mercado_usuarios mu
     JOIN usuarios u ON u.id = mu.usuario_id
     WHERE mu.mercado_id = $1
     ORDER BY mu.saldo DESC`,
    [id]
  );
  res.json(rows);
}

async function transferirEnMercado(req, res) {
  const { id } = req.params;
  const { destino_usuario_id, monto, descripcion } = req.body;
  if (!destino_usuario_id || !monto) return res.status(400).json({ error: 'destino_usuario_id y monto son requeridos' });

  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) return res.status(400).json({ error: 'Monto inválido' });
  if (parseInt(destino_usuario_id) === req.user.id) return res.status(400).json({ error: 'No podés transferirte a vos mismo' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [m] } = await client.query('SELECT estado FROM mercados WHERE id = $1', [id]);
    if (!m || m.estado !== 'abierto') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El mercado no está abierto' });
    }

    const { rows: [origen] } = await client.query(
      'SELECT saldo FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, req.user.id]
    );
    if (!origen) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No participás en este mercado' }); }
    if (parseFloat(origen.saldo) < montoNum) { await client.query('ROLLBACK'); return res.status(422).json({ error: 'Saldo insuficiente en el mercado' }); }

    const { rows: [destino] } = await client.query(
      `SELECT mu.usuario_id, u.nombre, u.apellido
       FROM mercado_usuarios mu JOIN usuarios u ON u.id = mu.usuario_id
       WHERE mu.mercado_id = $1 AND mu.usuario_id = $2 FOR UPDATE`,
      [id, destino_usuario_id]
    );
    if (!destino) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El destinatario no participa en este mercado' }); }

    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo - $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [montoNum, id, req.user.id]
    );
    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo + $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [montoNum, id, destino_usuario_id]
    );

    const { rows: [tx] } = await client.query(
      `INSERT INTO mercado_transacciones (mercado_id, tipo, usuario_origen_id, usuario_destino_id, monto, descripcion)
       VALUES ($1, 'transferencia', $2, $3, $4, $5) RETURNING *`,
      [id, req.user.id, destino_usuario_id, montoNum, descripcion || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ transaccion: tx, destinatario: { nombre: destino.nombre, apellido: destino.apellido } });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getTransacciones(req, res) {
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT mt.*,
         uo.nombre AS origen_nombre, uo.apellido AS origen_apellido,
         ud.nombre AS destino_nombre, ud.apellido AS destino_apellido
       FROM mercado_transacciones mt
       LEFT JOIN usuarios uo ON uo.id = mt.usuario_origen_id
       JOIN usuarios ud ON ud.id = mt.usuario_destino_id
       WHERE mt.mercado_id = $1
         AND (mt.usuario_origen_id = $2 OR mt.usuario_destino_id = $2)
       ORDER BY mt.created_at DESC
       LIMIT $3 OFFSET $4`,
      [id, req.user.id, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM mercado_transacciones
       WHERE mercado_id = $1 AND (usuario_origen_id = $2 OR usuario_destino_id = $2)`,
      [id, req.user.id]
    ),
  ]);

  const total = parseInt(countRows[0].count);
  res.json({ data: rows, total, page, totalPages: Math.ceil(total / limit), limit });
}

async function getProductos(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    'SELECT * FROM mercado_productos WHERE mercado_id = $1 AND activo = true ORDER BY nombre ASC',
    [id]
  );
  res.json(rows);
}

async function comprarProducto(req, res) {
  const { id } = req.params;
  const { producto_id } = req.body;
  if (!producto_id) return res.status(400).json({ error: 'producto_id es requerido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [m] } = await client.query('SELECT admin_id, estado FROM mercados WHERE id = $1 FOR UPDATE', [id]);
    if (!m || m.estado !== 'abierto') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El mercado no está abierto' }); }

    const { rows: [prod] } = await client.query(
      'SELECT * FROM mercado_productos WHERE id = $1 AND mercado_id = $2 AND activo = true FOR UPDATE',
      [producto_id, id]
    );
    if (!prod) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Producto no disponible' }); }
    if (prod.stock !== null && prod.stock <= 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Producto sin stock' }); }

    const { rows: [comprador] } = await client.query(
      'SELECT saldo FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, req.user.id]
    );
    if (!comprador) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No participás en este mercado' }); }
    if (parseFloat(comprador.saldo) < parseFloat(prod.precio)) { await client.query('ROLLBACK'); return res.status(422).json({ error: 'Saldo insuficiente' }); }

    await client.query(
      'SELECT 1 FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, m.admin_id]
    );

    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo - $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [prod.precio, id, req.user.id]
    );
    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo + $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [prod.precio, id, m.admin_id]
    );

    if (prod.stock !== null) {
      const nuevoStock = prod.stock - 1;
      await client.query(
        'UPDATE mercado_productos SET stock = $1, activo = $2 WHERE id = $3',
        [nuevoStock, nuevoStock > 0, prod.id]
      );
    }

    const { rows: [tx] } = await client.query(
      `INSERT INTO mercado_transacciones (mercado_id, tipo, usuario_origen_id, usuario_destino_id, monto, descripcion)
       VALUES ($1, 'compra', $2, $3, $4, $5) RETURNING *`,
      [id, req.user.id, m.admin_id, prod.precio, `Compra: ${prod.nombre}`]
    );

    await client.query('COMMIT');
    res.status(201).json({ transaccion: tx, producto: prod.nombre, monto: prod.precio });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function abandonarMercado(req, res) {
  const { id } = req.params;

  const { rows: [info] } = await pool.query(
    `SELECT mu.saldo, m.admin_id, mo.acronimo AS moneda_acronimo
     FROM mercado_usuarios mu
     JOIN mercados m ON m.id = mu.mercado_id
     JOIN monedas mo ON mo.id = m.moneda_id
     WHERE mu.mercado_id = $1 AND mu.usuario_id = $2`,
    [id, req.user.id]
  );
  if (!info) return res.status(404).json({ error: 'No participás en este mercado' });
  if (info.admin_id === req.user.id) return res.status(400).json({ error: 'El organizador no puede abandonar su propio mercado' });
  if (parseFloat(info.saldo) > 0) {
    return res.status(400).json({ error: `Tenés saldo pendiente (${info.moneda_acronimo}). Transferí o gastá tu saldo antes de abandonar.` });
  }

  await pool.query('DELETE FROM mercado_pseudo_admins WHERE mercado_id = $1 AND usuario_id = $2', [id, req.user.id]);
  await pool.query('DELETE FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2', [id, req.user.id]);

  res.json({ mensaje: 'Abandonaste el mercado correctamente' });
}

module.exports = {
  infoPorCodigo, unirseAlMercado, misMercados, getMercado,
  getParticipantes, transferirEnMercado, getTransacciones,
  getProductos, comprarProducto, abandonarMercado,
};
