const pool = require('../config/db');

async function transferir(req, res) {
  const { destino_alias_o_cbu, monto, descripcion } = req.body;

  if (!destino_alias_o_cbu || !monto) {
    return res.status(400).json({ error: 'Destino y monto son requeridos' });
  }

  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: 'Monto inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloquear fila del origen para evitar condiciones de carrera
    const { rows: origen } = await client.query(
      'SELECT id, saldo FROM usuarios WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    if (origen.length === 0) throw new Error('Usuario origen no encontrado');

    if (parseFloat(origen[0].saldo) < montoNum) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'Saldo insuficiente' });
    }

    // Buscar destino por alias o CBU
    const { rows: destino } = await client.query(
      'SELECT id, nombre, apellido FROM usuarios WHERE alias = $1 OR cbu = $1 FOR UPDATE',
      [destino_alias_o_cbu]
    );
    if (destino.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Destinatario no encontrado' });
    }
    if (destino[0].id === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No podés transferirte a vos mismo' });
    }

    // Descontar origen
    await client.query(
      'UPDATE usuarios SET saldo = saldo - $1 WHERE id = $2',
      [montoNum, req.user.id]
    );

    // Acreditar destino
    await client.query(
      'UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2',
      [montoNum, destino[0].id]
    );

    // Registrar transacción
    const { rows: tx } = await client.query(
      `INSERT INTO transacciones (usuario_origen_id, usuario_destino_id, monto, tipo, descripcion)
       VALUES ($1, $2, $3, 'transferencia', $4)
       RETURNING *`,
      [req.user.id, destino[0].id, montoNum, descripcion || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      transaccion: tx[0],
      destinatario: { nombre: destino[0].nombre, apellido: destino[0].apellido },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getHistorial(req, res) {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT t.*,
         o.nombre AS origen_nombre, o.apellido AS origen_apellido, o.alias AS origen_alias,
         d.nombre AS destino_nombre, d.apellido AS destino_apellido, d.alias AS destino_alias
       FROM transacciones t
       LEFT JOIN usuarios o ON o.id = t.usuario_origen_id
       JOIN usuarios d ON d.id = t.usuario_destino_id
       WHERE t.usuario_origen_id = $1 OR t.usuario_destino_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM transacciones
       WHERE usuario_origen_id = $1 OR usuario_destino_id = $1`,
      [req.user.id]
    ),
  ]);

  const total = parseInt(countRows[0].count);
  res.json({ data: rows, total, page, totalPages: Math.ceil(total / limit), limit });
}

module.exports = { transferir, getHistorial };
