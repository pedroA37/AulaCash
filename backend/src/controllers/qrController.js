const pool = require('../config/db');

const QR_EXPIRACION_MINUTOS = 30;

async function generarQR(req, res) {
  const { monto, mercado_id } = req.body;
  const montoNum = parseFloat(monto);
  if (!monto || isNaN(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: 'Monto inválido' });
  }
  if (!mercado_id) {
    return res.status(400).json({ error: 'mercado_id es requerido' });
  }

  const { rows: [mu] } = await pool.query(
    `SELECT mu.saldo, m.estado, mo.acronimo AS moneda_acronimo
     FROM mercado_usuarios mu
     JOIN mercados m ON m.id = mu.mercado_id
     JOIN monedas mo ON mo.id = m.moneda_id
     WHERE mu.mercado_id = $1 AND mu.usuario_id = $2`,
    [mercado_id, req.user.id]
  );
  if (!mu) return res.status(403).json({ error: 'No participás en este mercado' });
  if (mu.estado !== 'abierto') return res.status(400).json({ error: 'El mercado no está abierto' });

  const expiresAt = new Date(Date.now() + QR_EXPIRACION_MINUTOS * 60 * 1000);

  const { rows: [qr] } = await pool.query(
    `INSERT INTO codigos_qr (usuario_emisor_id, mercado_id, monto, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING token, monto, expires_at`,
    [req.user.id, mercado_id, montoNum, expiresAt]
  );

  res.status(201).json({ ...qr, moneda_acronimo: mu.moneda_acronimo });
}

async function infoQR(req, res) {
  const { token } = req.params;

  const { rows: [qr] } = await pool.query(
    `SELECT q.token, q.monto, q.estado, q.expires_at, q.mercado_id,
            u.nombre, u.apellido, u.alias,
            mo.acronimo AS moneda_acronimo, mo.nombre AS moneda_nombre,
            m.nombre AS mercado_nombre
     FROM codigos_qr q
     JOIN usuarios u ON u.id = q.usuario_emisor_id
     JOIN mercados m ON m.id = q.mercado_id
     JOIN monedas mo ON mo.id = m.moneda_id
     WHERE q.token = $1`,
    [token]
  );

  if (!qr) return res.status(404).json({ error: 'QR no encontrado' });
  if (qr.estado !== 'pendiente') return res.status(410).json({ error: `El QR ya fue ${qr.estado}` });
  if (new Date(qr.expires_at) < new Date()) {
    await pool.query("UPDATE codigos_qr SET estado = 'expirado' WHERE token = $1", [token]);
    return res.status(410).json({ error: 'El QR expiró' });
  }

  res.json(qr);
}

async function cobrarQR(req, res) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token requerido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [qr] } = await client.query(
      `SELECT q.id, q.monto, q.estado, q.expires_at, q.mercado_id,
              q.usuario_emisor_id AS emisor_id
       FROM codigos_qr q
       WHERE q.token = $1
       FOR UPDATE OF q`,
      [token]
    );

    if (!qr) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'QR no encontrado' }); }
    if (!qr.mercado_id) { await client.query('ROLLBACK'); return res.status(410).json({ error: 'QR inválido' }); }
    if (qr.estado !== 'pendiente') { await client.query('ROLLBACK'); return res.status(410).json({ error: `El QR ya fue ${qr.estado}` }); }
    if (new Date(qr.expires_at) < new Date()) {
      await client.query("UPDATE codigos_qr SET estado = 'expirado' WHERE id = $1", [qr.id]);
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'El QR expiró' });
    }
    if (qr.emisor_id === req.user.id) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'No podés pagar tu propio QR' }); }

    const montoNum = parseFloat(qr.monto);

    const { rows: [pagador] } = await client.query(
      'SELECT saldo FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2 FOR UPDATE',
      [qr.mercado_id, req.user.id]
    );
    if (!pagador) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No participás en el mercado de este QR' }); }
    if (parseFloat(pagador.saldo) < montoNum) { await client.query('ROLLBACK'); return res.status(422).json({ error: 'Saldo insuficiente en el mercado' }); }

    // Bloquear fila del emisor
    await client.query(
      'SELECT 1 FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2 FOR UPDATE',
      [qr.mercado_id, qr.emisor_id]
    );

    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo - $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [montoNum, qr.mercado_id, req.user.id]
    );
    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo + $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [montoNum, qr.mercado_id, qr.emisor_id]
    );

    await client.query("UPDATE codigos_qr SET estado = 'usado' WHERE id = $1", [qr.id]);

    const { rows: [tx] } = await client.query(
      `INSERT INTO mercado_transacciones (mercado_id, tipo, usuario_origen_id, usuario_destino_id, monto, descripcion)
       VALUES ($1, 'transferencia', $2, $3, $4, 'Pago con QR')
       RETURNING *`,
      [qr.mercado_id, req.user.id, qr.emisor_id, montoNum]
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

module.exports = { generarQR, infoQR, cobrarQR };
