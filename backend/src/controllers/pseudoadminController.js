const pool = require('../config/db');

async function misMercados(req, res) {
  const { rows } = await pool.query(
    `SELECT m.id, m.nombre, m.logo_url, m.estado, m.hora_cierre,
       mo.id AS moneda_id, mo.nombre AS moneda_nombre, mo.acronimo AS moneda_acronimo
     FROM mercados m
     JOIN monedas mo ON mo.id = m.moneda_id
     JOIN mercado_pseudo_admins pa ON pa.mercado_id = m.id
     WHERE pa.usuario_id = $1
     ORDER BY m.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

async function getParticipantes(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT mu.usuario_id, mu.saldo, mu.joined_at, u.nombre, u.apellido, u.email, u.alias
     FROM mercado_usuarios mu
     JOIN usuarios u ON u.id = mu.usuario_id
     WHERE mu.mercado_id = $1
     ORDER BY u.apellido ASC`,
    [id]
  );
  res.json(rows);
}

async function cargarSaldo(req, res) {
  const { id } = req.params;
  const { usuario_id, monto, descripcion } = req.body;
  if (!usuario_id || !monto) return res.status(400).json({ error: 'usuario_id y monto son requeridos' });

  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) return res.status(400).json({ error: 'Monto inválido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [m] } = await client.query('SELECT estado, admin_id FROM mercados WHERE id = $1', [id]);
    if (!m) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Mercado no encontrado' }); }
    if (m.estado !== 'abierto') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El mercado no está abierto' }); }

    const { rows: [dest] } = await client.query(
      `SELECT mu.usuario_id, u.nombre, u.apellido
       FROM mercado_usuarios mu JOIN usuarios u ON u.id = mu.usuario_id
       WHERE mu.mercado_id = $1 AND mu.usuario_id = $2 FOR UPDATE`,
      [id, usuario_id]
    );
    if (!dest) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El usuario no participa en este mercado' }); }

    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo + $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [montoNum, id, usuario_id]
    );

    const { rows: [tx] } = await client.query(
      `INSERT INTO mercado_transacciones (mercado_id, tipo, usuario_origen_id, usuario_destino_id, monto, descripcion)
       VALUES ($1, 'carga', NULL, $2, $3, $4) RETURNING *`,
      [id, usuario_id, montoNum, descripcion || 'Carga de saldo por pseudo-admin']
    );

    await client.query('COMMIT');
    res.status(201).json({
      transaccion: tx,
      destinatario: { nombre: dest.nombre, apellido: dest.apellido },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { misMercados, getParticipantes, cargarSaldo };
