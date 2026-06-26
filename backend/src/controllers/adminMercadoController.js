const pool = require('../config/db');
const { generarCodigoUnico } = require('../services/codigoMercado');

async function crearMercado(req, res) {
  const { nombre, logo_url, moneda_nombre, moneda_acronimo } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre del mercado es requerido' });
  if (!moneda_nombre) return res.status(400).json({ error: 'El nombre de la moneda es requerido' });
  if (!moneda_acronimo) return res.status(400).json({ error: 'El acrónimo de la moneda es requerido' });

  const acronimo = moneda_acronimo.toUpperCase().trim();
  if (acronimo.length > 10) return res.status(400).json({ error: 'El acrónimo no puede superar 10 caracteres' });

  const codigo = await generarCodigoUnico();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [moneda] } = await client.query(
      'INSERT INTO monedas (nombre, acronimo) VALUES ($1, $2) RETURNING *',
      [moneda_nombre.trim(), acronimo]
    );

    const { rows: [mercado] } = await client.query(
      `INSERT INTO mercados (nombre, logo_url, moneda_id, admin_id, codigo)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre.trim(), logo_url || null, moneda.id, req.user.id, codigo]
    );

    await client.query(
      'INSERT INTO mercado_usuarios (mercado_id, usuario_id, saldo) VALUES ($1, $2, 0)',
      [mercado.id, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({
      ...mercado,
      moneda_id: moneda.id,
      moneda_nombre: moneda.nombre,
      moneda_acronimo: moneda.acronimo,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listarMercados(req, res) {
  const { rows } = await pool.query(
    `SELECT m.*, mo.id AS moneda_id, mo.nombre AS moneda_nombre, mo.acronimo AS moneda_acronimo,
       (SELECT COUNT(*) FROM mercado_usuarios mu WHERE mu.mercado_id = m.id) AS total_participantes
     FROM mercados m
     JOIN monedas mo ON mo.id = m.moneda_id
     WHERE m.admin_id = $1
     ORDER BY m.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

async function getMercado(req, res) {
  const { id } = req.params;
  const { rows: [m] } = await pool.query(
    `SELECT m.*, mo.id AS moneda_id, mo.nombre AS moneda_nombre, mo.acronimo AS moneda_acronimo
     FROM mercados m
     JOIN monedas mo ON mo.id = m.moneda_id
     WHERE m.id = $1`,
    [id]
  );
  if (!m) return res.status(404).json({ error: 'Mercado no encontrado' });

  const { rows: participantes } = await pool.query(
    `SELECT mu.usuario_id, mu.saldo, mu.joined_at,
       u.nombre, u.apellido, u.email, u.alias,
       EXISTS(SELECT 1 FROM mercado_pseudo_admins pa WHERE pa.mercado_id = $1 AND pa.usuario_id = mu.usuario_id) AS es_pseudo_admin
     FROM mercado_usuarios mu
     JOIN usuarios u ON u.id = mu.usuario_id
     WHERE mu.mercado_id = $1
     AND mu.usuario_id != $2
     ORDER BY mu.joined_at ASC`,
    [id, req.user.id]
  );

  const { rows: pseudo_admins } = await pool.query(
    `SELECT pa.usuario_id, u.nombre, u.apellido, u.email
     FROM mercado_pseudo_admins pa
     JOIN usuarios u ON u.id = pa.usuario_id
     WHERE pa.mercado_id = $1`,
    [id]
  );

  res.json({ ...m, participantes, pseudo_admins });
}

async function actualizarMercado(req, res) {
  const { id } = req.params;
  const { nombre, logo_url, moneda_nombre, moneda_acronimo, hora_cierre } = req.body;

  const { rows: [m] } = await pool.query(
    'SELECT estado, moneda_id FROM mercados WHERE id = $1',
    [id]
  );
  if (!m) return res.status(404).json({ error: 'Mercado no encontrado' });
  if (m.estado === 'cerrado') return res.status(400).json({ error: 'No se puede editar un mercado cerrado' });

  // Campos de mercados
  const camposMercado = [];
  const valsMercado = [];
  let idxM = 1;

  if (nombre !== undefined) { camposMercado.push(`nombre = $${idxM++}`); valsMercado.push(nombre.trim()); }
  if (logo_url !== undefined) { camposMercado.push(`logo_url = $${idxM++}`); valsMercado.push(logo_url || null); }
  if (hora_cierre !== undefined) {
    camposMercado.push(`hora_cierre = $${idxM++}`);
    camposMercado.push(`notificacion_30_enviada = false`);
    valsMercado.push(hora_cierre || null);
  }

  // Campos de monedas
  const camposMoneda = [];
  const valsMoneda = [];
  let idxMo = 1;

  if (moneda_nombre !== undefined) { camposMoneda.push(`nombre = $${idxMo++}`); valsMoneda.push(moneda_nombre.trim()); }
  if (moneda_acronimo !== undefined) { camposMoneda.push(`acronimo = $${idxMo++}`); valsMoneda.push(moneda_acronimo.toUpperCase().trim()); }

  if (camposMercado.length === 0 && camposMoneda.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  if (camposMercado.length > 0) {
    valsMercado.push(id);
    await pool.query(
      `UPDATE mercados SET ${camposMercado.join(', ')} WHERE id = $${idxM}`,
      valsMercado
    );
  }

  if (camposMoneda.length > 0) {
    valsMoneda.push(m.moneda_id);
    await pool.query(
      `UPDATE monedas SET ${camposMoneda.join(', ')} WHERE id = $${idxMo}`,
      valsMoneda
    );
  }

  const { rows: [actualizado] } = await pool.query(
    `SELECT m.*, mo.id AS moneda_id, mo.nombre AS moneda_nombre, mo.acronimo AS moneda_acronimo
     FROM mercados m JOIN monedas mo ON mo.id = m.moneda_id
     WHERE m.id = $1`,
    [id]
  );
  res.json(actualizado);
}

async function abrirMercado(req, res) {
  const { id } = req.params;
  const { rows: [m] } = await pool.query('SELECT estado FROM mercados WHERE id = $1', [id]);
  if (!m) return res.status(404).json({ error: 'Mercado no encontrado' });
  if (m.estado === 'abierto') return res.status(400).json({ error: 'El mercado ya está abierto' });

  const { rows: [actualizado] } = await pool.query(
    `UPDATE mercados SET estado = 'abierto', hora_inicio = NOW() WHERE id = $1
     RETURNING *`,
    [id]
  );
  const { rows: [moneda] } = await pool.query('SELECT id, nombre, acronimo FROM monedas WHERE id = $1', [actualizado.moneda_id]);
  res.json({ ...actualizado, moneda_id: moneda.id, moneda_nombre: moneda.nombre, moneda_acronimo: moneda.acronimo });
}

async function cerrarMercado(req, res) {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [m] } = await client.query('SELECT * FROM mercados WHERE id = $1 FOR UPDATE', [id]);
    if (!m) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Mercado no encontrado' }); }
    if (m.estado !== 'abierto') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Solo se puede cerrar un mercado abierto' }); }

    const { rows: participantes } = await client.query(
      `SELECT mu.usuario_id, mu.saldo
       FROM mercado_usuarios mu
       WHERE mu.mercado_id = $1 AND mu.usuario_id != $2 AND mu.saldo > 0
       FOR UPDATE`,
      [id, m.admin_id]
    );

    let totalDevuelto = 0;
    for (const p of participantes) {
      await client.query(
        'UPDATE mercado_usuarios SET saldo = 0 WHERE mercado_id = $1 AND usuario_id = $2',
        [id, p.usuario_id]
      );
      await client.query(
        `INSERT INTO mercado_transacciones (mercado_id, tipo, usuario_origen_id, usuario_destino_id, monto, descripcion)
         VALUES ($1, 'devolucion', $2, $3, $4, 'Devolución al cierre del mercado')`,
        [id, p.usuario_id, m.admin_id, p.saldo]
      );
      totalDevuelto += parseFloat(p.saldo);
    }

    // Zerar saldo del admin en el mercado (el dinero virtual queda anulado al cierre)
    await client.query(
      'UPDATE mercado_usuarios SET saldo = 0 WHERE mercado_id = $1 AND usuario_id = $2',
      [id, m.admin_id]
    );

    await client.query(`UPDATE mercados SET estado = 'cerrado' WHERE id = $1`, [id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Mercado cerrado correctamente', total_cobrado: totalDevuelto });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function agregarPseudoAdmin(req, res) {
  const { id } = req.params;
  const { usuario_id } = req.body;
  if (!usuario_id) return res.status(400).json({ error: 'usuario_id es requerido' });

  const { rows: [m] } = await pool.query('SELECT admin_id FROM mercados WHERE id = $1', [id]);
  if (!m) return res.status(404).json({ error: 'Mercado no encontrado' });
  if (parseInt(usuario_id) === m.admin_id) return res.status(400).json({ error: 'El admin ya administra este mercado' });

  const { rowCount: esParticipante } = await pool.query(
    'SELECT 1 FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2',
    [id, usuario_id]
  );
  if (esParticipante === 0) return res.status(400).json({ error: 'El usuario no participa en este mercado' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO mercado_pseudo_admins (mercado_id, usuario_id, creado_por)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [id, usuario_id, req.user.id]
    );
    res.status(201).json(rows[0] || { mensaje: 'Ya era pseudo-admin' });
  } catch {
    res.status(409).json({ error: 'Ya es pseudo-admin de este mercado' });
  }
}

async function removerPseudoAdmin(req, res) {
  const { id, uid } = req.params;
  const { rowCount } = await pool.query(
    'DELETE FROM mercado_pseudo_admins WHERE mercado_id = $1 AND usuario_id = $2',
    [id, uid]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'Pseudo-admin no encontrado' });
  res.json({ mensaje: 'Pseudo-admin removido correctamente' });
}

async function getSumasSaldos(req, res) {
  const { id } = req.params;

  const { rows: [stats] } = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'carga'          THEN monto ELSE 0 END), 0) AS total_cargado,
       COALESCE(SUM(CASE WHEN tipo = 'compra'         THEN monto ELSE 0 END), 0) AS total_compras,
       COALESCE(SUM(CASE WHEN tipo = 'devolucion'     THEN monto ELSE 0 END), 0) AS total_devuelto,
       COALESCE(SUM(CASE WHEN tipo = 'transferencia'  THEN monto ELSE 0 END), 0) AS volumen_transferencias,
       COUNT(*) FILTER (WHERE tipo = 'carga')         AS cantidad_cargas,
       COUNT(*) FILTER (WHERE tipo = 'compra')        AS cantidad_compras,
       COUNT(*) FILTER (WHERE tipo = 'transferencia') AS cantidad_transferencias
     FROM mercado_transacciones
     WHERE mercado_id = $1`,
    [id]
  );

  const { rows: saldos_actuales } = await pool.query(
    `SELECT mu.saldo, u.nombre, u.apellido
     FROM mercado_usuarios mu
     JOIN usuarios u ON u.id = mu.usuario_id
     WHERE mu.mercado_id = $1
       AND mu.usuario_id != (SELECT admin_id FROM mercados WHERE id = $1)
     ORDER BY mu.saldo DESC`,
    [id]
  );

  const total_en_circulacion = saldos_actuales.reduce((s, r) => s + parseFloat(r.saldo), 0);

  res.json({
    ...stats,
    total_cargado: parseFloat(stats.total_cargado),
    total_compras: parseFloat(stats.total_compras),
    total_devuelto: parseFloat(stats.total_devuelto),
    volumen_transferencias: parseFloat(stats.volumen_transferencias),
    total_en_circulacion,
    balance_ok: Math.abs(
      parseFloat(stats.total_cargado) - parseFloat(stats.total_compras) -
      parseFloat(stats.total_devuelto) - total_en_circulacion
    ) < 0.01,
    saldos_actuales,
  });
}

async function eliminarMercado(req, res) {
  const { id } = req.params;
  const { rows: [m] } = await pool.query('SELECT estado, moneda_id FROM mercados WHERE id = $1', [id]);
  if (!m) return res.status(404).json({ error: 'Mercado no encontrado' });
  if (m.estado === 'abierto') return res.status(400).json({ error: 'No se puede eliminar un mercado abierto. Cerralo primero.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM mercado_transacciones WHERE mercado_id = $1', [id]);
    await client.query('DELETE FROM codigos_qr WHERE mercado_id = $1', [id]);
    await client.query('DELETE FROM mercado_productos WHERE mercado_id = $1', [id]);
    await client.query('DELETE FROM mercado_pseudo_admins WHERE mercado_id = $1', [id]);
    await client.query('DELETE FROM mercado_usuarios WHERE mercado_id = $1', [id]);
    await client.query('DELETE FROM mercados WHERE id = $1', [id]);
    await client.query('DELETE FROM monedas WHERE id = $1', [m.moneda_id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Mercado eliminado correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listarProductos(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    'SELECT * FROM mercado_productos WHERE mercado_id = $1 AND activo = true ORDER BY created_at DESC',
    [id]
  );
  res.json(rows);
}

async function crearProducto(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, precio, imagen_url, stock } = req.body;
  if (!nombre || !precio) return res.status(400).json({ error: 'nombre y precio son requeridos' });
  const precioNum = parseFloat(precio);
  if (isNaN(precioNum) || precioNum <= 0) return res.status(400).json({ error: 'Precio inválido' });

  const { rows } = await pool.query(
    `INSERT INTO mercado_productos (mercado_id, nombre, descripcion, precio, imagen_url, stock)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [id, nombre.trim(), descripcion || null, precioNum, imagen_url || null, stock != null ? parseInt(stock) : null]
  );
  res.status(201).json(rows[0]);
}

async function actualizarProducto(req, res) {
  const { id, pid } = req.params;
  const { nombre, descripcion, precio, imagen_url, stock, activo } = req.body;

  const campos = [];
  const vals = [];
  let idx = 1;

  if (nombre !== undefined) { campos.push(`nombre = $${idx++}`); vals.push(nombre.trim()); }
  if (descripcion !== undefined) { campos.push(`descripcion = $${idx++}`); vals.push(descripcion || null); }
  if (precio !== undefined) { campos.push(`precio = $${idx++}`); vals.push(parseFloat(precio)); }
  if (imagen_url !== undefined) { campos.push(`imagen_url = $${idx++}`); vals.push(imagen_url || null); }
  if (stock !== undefined) { campos.push(`stock = $${idx++}`); vals.push(stock != null ? parseInt(stock) : null); }
  if (activo !== undefined) { campos.push(`activo = $${idx++}`); vals.push(Boolean(activo)); }

  if (campos.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

  vals.push(pid, id);
  const { rows } = await pool.query(
    `UPDATE mercado_productos SET ${campos.join(', ')} WHERE id = $${idx++} AND mercado_id = $${idx} RETURNING *`,
    vals
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(rows[0]);
}

async function eliminarProducto(req, res) {
  const { id, pid } = req.params;
  const { rows } = await pool.query(
    'UPDATE mercado_productos SET activo = false WHERE id = $1 AND mercado_id = $2 RETURNING id',
    [pid, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ mensaje: 'Producto desactivado' });
}

module.exports = {
  crearMercado, listarMercados, getMercado, actualizarMercado, eliminarMercado,
  abrirMercado, cerrarMercado,
  agregarPseudoAdmin, removerPseudoAdmin,
  getSumasSaldos,
  listarProductos, crearProducto, actualizarProducto, eliminarProducto,
};
