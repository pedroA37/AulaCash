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
    `SELECT p.*,
       u.nombre AS vendedor_nombre, u.apellido AS vendedor_apellido
     FROM mercado_productos p
     LEFT JOIN usuarios u ON u.id = p.vendedor_id
     WHERE p.mercado_id = $1 AND p.activo = true
     ORDER BY p.created_at DESC`,
    [id]
  );
  res.json(rows);
}

async function getProducto(req, res) {
  const { id, pid } = req.params;
  const { rows: [prod] } = await pool.query(
    `SELECT p.*,
       u.nombre AS vendedor_nombre, u.apellido AS vendedor_apellido
     FROM mercado_productos p
     LEFT JOIN usuarios u ON u.id = p.vendedor_id
     WHERE p.id = $1 AND p.mercado_id = $2 AND p.activo = true`,
    [pid, id]
  );
  if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

  const { rows: sugeridos } = await pool.query(
    `SELECT p.*,
       u.nombre AS vendedor_nombre, u.apellido AS vendedor_apellido
     FROM mercado_productos p
     LEFT JOIN usuarios u ON u.id = p.vendedor_id
     WHERE p.mercado_id = $1 AND p.activo = true AND p.id != $2
     ORDER BY RANDOM()
     LIMIT 4`,
    [id, pid]
  );

  res.json({ ...prod, sugeridos });
}

async function getMisProductos(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT p.*,
       u.nombre AS vendedor_nombre, u.apellido AS vendedor_apellido
     FROM mercado_productos p
     LEFT JOIN usuarios u ON u.id = p.vendedor_id
     WHERE p.mercado_id = $1 AND p.vendedor_id = $2
     ORDER BY p.created_at DESC`,
    [id, req.user.id]
  );
  res.json(rows);
}

async function crearMiProducto(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, precio, imagen_url, stock } = req.body;

  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  const precioNum = parseFloat(precio);
  if (isNaN(precioNum) || precioNum <= 0) return res.status(400).json({ error: 'El precio debe ser mayor a 0' });

  const { rows: [m] } = await pool.query('SELECT estado FROM mercados WHERE id = $1', [id]);
  if (!m) return res.status(404).json({ error: 'Mercado no encontrado' });
  if (m.estado === 'cerrado') return res.status(400).json({ error: 'No se pueden agregar productos a un mercado cerrado' });

  const { rows: [prod] } = await pool.query(
    `INSERT INTO mercado_productos (mercado_id, nombre, descripcion, precio, imagen_url, stock, vendedor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, nombre.trim(), descripcion?.trim() || null, precioNum, imagen_url || null, stock != null ? parseInt(stock) : null, req.user.id]
  );

  res.status(201).json(prod);
}

async function actualizarMiProducto(req, res) {
  const { id, pid } = req.params;
  const { nombre, descripcion, precio, imagen_url, stock } = req.body;

  const { rows: [prod] } = await pool.query(
    'SELECT * FROM mercado_productos WHERE id = $1 AND mercado_id = $2',
    [pid, id]
  );
  if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
  if (prod.vendedor_id !== req.user.id) return res.status(403).json({ error: 'No podés editar un producto que no es tuyo' });

  const nuevoNombre = nombre?.trim() || prod.nombre;
  const nuevaDesc = descripcion !== undefined ? (descripcion?.trim() || null) : prod.descripcion;
  const nuevoPrecio = precio != null ? parseFloat(precio) : parseFloat(prod.precio);
  const nuevaImagen = imagen_url !== undefined ? (imagen_url || null) : prod.imagen_url;
  const nuevoStock = stock !== undefined ? (stock === '' || stock === null ? null : parseInt(stock)) : prod.stock;

  const { rows: [updated] } = await pool.query(
    `UPDATE mercado_productos
     SET nombre = $1, descripcion = $2, precio = $3, imagen_url = $4, stock = $5
     WHERE id = $6 RETURNING *`,
    [nuevoNombre, nuevaDesc, nuevoPrecio, nuevaImagen, nuevoStock, pid]
  );

  res.json(updated);
}

async function eliminarMiProducto(req, res) {
  const { id, pid } = req.params;

  const { rows: [prod] } = await pool.query(
    'SELECT vendedor_id FROM mercado_productos WHERE id = $1 AND mercado_id = $2',
    [pid, id]
  );
  if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
  if (prod.vendedor_id !== req.user.id) return res.status(403).json({ error: 'No podés eliminar un producto que no es tuyo' });

  await pool.query('UPDATE mercado_productos SET activo = false WHERE id = $1', [pid]);
  res.json({ mensaje: 'Producto dado de baja' });
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

    const vendedorId = prod.vendedor_id || m.admin_id;
    if (vendedorId === req.user.id) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'No podés comprar tu propio producto' }); }

    const { rows: [comprador] } = await client.query(
      'SELECT saldo FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, req.user.id]
    );
    if (!comprador) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No participás en este mercado' }); }
    if (parseFloat(comprador.saldo) < parseFloat(prod.precio)) { await client.query('ROLLBACK'); return res.status(422).json({ error: 'Saldo insuficiente' }); }

    await client.query(
      'SELECT 1 FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, vendedorId]
    );

    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo - $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [prod.precio, id, req.user.id]
    );
    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo + $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [prod.precio, id, vendedorId]
    );

    if (prod.stock !== null) {
      const nuevoStock = prod.stock - 1;
      await client.query(
        'UPDATE mercado_productos SET stock = $1, activo = $2 WHERE id = $3',
        [nuevoStock, nuevoStock > 0, prod.id]
      );
    }

    const { rows: [pedido] } = await client.query(
      'INSERT INTO mercado_pedidos (mercado_id, comprador_id, total) VALUES ($1, $2, $3) RETURNING *',
      [id, req.user.id, prod.precio]
    );

    await client.query(
      `INSERT INTO mercado_pedido_items (pedido_id, producto_id, vendedor_id, nombre_producto, precio, cantidad)
       VALUES ($1, $2, $3, $4, $5, 1)`,
      [pedido.id, prod.id, vendedorId, prod.nombre, prod.precio]
    );

    const { rows: [tx] } = await client.query(
      `INSERT INTO mercado_transacciones (mercado_id, tipo, usuario_origen_id, usuario_destino_id, monto, descripcion, pedido_id)
       VALUES ($1, 'compra', $2, $3, $4, $5, $6) RETURNING *`,
      [id, req.user.id, vendedorId, prod.precio, `Compra: ${prod.nombre}`, pedido.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ transaccion: tx, producto: prod.nombre, monto: prod.precio, pedido_id: pedido.id });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function comprarCarrito(req, res) {
  const { id } = req.params;
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [m] } = await client.query('SELECT admin_id, estado FROM mercados WHERE id = $1 FOR UPDATE', [id]);
    if (!m || m.estado !== 'abierto') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El mercado no está abierto' }); }

    const productoIds = [...new Set(items.map((i) => parseInt(i.producto_id)))];
    const { rows: productos } = await client.query(
      `SELECT * FROM mercado_productos WHERE id = ANY($1) AND mercado_id = $2 AND activo = true FOR UPDATE`,
      [productoIds, id]
    );

    let total = 0;
    const itemsProc = [];

    for (const item of items) {
      const prod = productos.find((p) => p.id === parseInt(item.producto_id));
      if (!prod) { await client.query('ROLLBACK'); return res.status(404).json({ error: `Producto no disponible` }); }

      const cantidad = Math.max(1, parseInt(item.cantidad) || 1);
      if (prod.stock !== null && prod.stock < cantidad) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Stock insuficiente para "${prod.nombre}" (disponible: ${prod.stock})` });
      }

      const vendedorId = prod.vendedor_id || m.admin_id;
      if (vendedorId === req.user.id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `No podés comprar tu propio producto: "${prod.nombre}"` });
      }

      total += parseFloat(prod.precio) * cantidad;
      itemsProc.push({ prod, cantidad, vendedorId });
    }

    const { rows: [comprador] } = await client.query(
      'SELECT saldo FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, req.user.id]
    );
    if (!comprador) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No participás en este mercado' }); }
    if (parseFloat(comprador.saldo) < total) { await client.query('ROLLBACK'); return res.status(422).json({ error: `Saldo insuficiente (necesitás ${total})` }); }

    const vendedorIds = [...new Set(itemsProc.map((i) => i.vendedorId))];
    for (const vId of vendedorIds) {
      await client.query(
        'SELECT 1 FROM mercado_usuarios WHERE mercado_id = $1 AND usuario_id = $2 FOR UPDATE',
        [id, vId]
      );
    }

    const { rows: [pedido] } = await client.query(
      'INSERT INTO mercado_pedidos (mercado_id, comprador_id, total) VALUES ($1, $2, $3) RETURNING *',
      [id, req.user.id, total]
    );

    await client.query(
      'UPDATE mercado_usuarios SET saldo = saldo - $1 WHERE mercado_id = $2 AND usuario_id = $3',
      [total, id, req.user.id]
    );

    for (const { prod, cantidad, vendedorId } of itemsProc) {
      const subtotal = parseFloat(prod.precio) * cantidad;

      await client.query(
        'UPDATE mercado_usuarios SET saldo = saldo + $1 WHERE mercado_id = $2 AND usuario_id = $3',
        [subtotal, id, vendedorId]
      );

      if (prod.stock !== null) {
        const nuevoStock = prod.stock - cantidad;
        await client.query(
          'UPDATE mercado_productos SET stock = $1, activo = $2 WHERE id = $3',
          [nuevoStock, nuevoStock > 0, prod.id]
        );
      }

      await client.query(
        `INSERT INTO mercado_pedido_items (pedido_id, producto_id, vendedor_id, nombre_producto, precio, cantidad)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [pedido.id, prod.id, vendedorId, prod.nombre, prod.precio, cantidad]
      );

      await client.query(
        `INSERT INTO mercado_transacciones (mercado_id, tipo, usuario_origen_id, usuario_destino_id, monto, descripcion, pedido_id)
         VALUES ($1, 'compra', $2, $3, $4, $5, $6)`,
        [id, req.user.id, vendedorId, subtotal, `Compra${cantidad > 1 ? ` x${cantidad}` : ''}: ${prod.nombre}`, pedido.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ pedido_id: pedido.id, total, items: itemsProc.length });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getPedidos(req, res) {
  const { id } = req.params;
  const tipo = req.query.tipo || 'compras';

  if (tipo === 'compras') {
    const { rows } = await pool.query(
      `SELECT p.id, p.total, p.created_at,
         json_agg(
           json_build_object(
             'nombre_producto', pi.nombre_producto,
             'precio',          pi.precio,
             'cantidad',        pi.cantidad,
             'vendedor_nombre', u.nombre,
             'vendedor_apellido', u.apellido
           ) ORDER BY pi.id
         ) AS items
       FROM mercado_pedidos p
       JOIN mercado_pedido_items pi ON pi.pedido_id = p.id
       JOIN usuarios u ON u.id = pi.vendedor_id
       WHERE p.mercado_id = $1 AND p.comprador_id = $2
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [id, req.user.id]
    );
    return res.json(rows);
  }

  if (tipo === 'ventas') {
    const { rows } = await pool.query(
      `SELECT pi.id, pi.nombre_producto, pi.precio, pi.cantidad,
         p.id AS pedido_id, p.created_at,
         u.nombre AS comprador_nombre, u.apellido AS comprador_apellido
       FROM mercado_pedido_items pi
       JOIN mercado_pedidos p ON p.id = pi.pedido_id
       JOIN usuarios u ON u.id = p.comprador_id
       WHERE p.mercado_id = $1 AND pi.vendedor_id = $2
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [id, req.user.id]
    );
    return res.json(rows);
  }

  res.status(400).json({ error: 'tipo debe ser "compras" o "ventas"' });
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
  getProductos, getProducto, getMisProductos,
  crearMiProducto, actualizarMiProducto, eliminarMiProducto,
  comprarProducto, comprarCarrito, getPedidos,
  abandonarMercado,
};
