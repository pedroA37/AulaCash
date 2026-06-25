const pool = require('../config/db');

async function getMe(req, res) {
  const { rows } = await pool.query(
    `SELECT id, dni, email, nombre, apellido, alias, cbu, rol, created_at
     FROM usuarios WHERE id = $1`,
    [req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
}

async function buscarUsuario(req, res) {
  const { alias, cbu, dni, nombre } = req.query;
  if (!alias && !cbu && !dni && !nombre) {
    return res.status(400).json({ error: 'Indicar alias, CBU, DNI o nombre para buscar' });
  }

  let rows;

  if (alias) {
    ({ rows } = await pool.query(
      'SELECT id, nombre, apellido, alias, cbu FROM usuarios WHERE alias = $1',
      [alias]
    ));
  } else if (cbu) {
    ({ rows } = await pool.query(
      'SELECT id, nombre, apellido, alias, cbu FROM usuarios WHERE cbu = $1',
      [cbu]
    ));
  } else if (dni) {
    ({ rows } = await pool.query(
      'SELECT id, nombre, apellido, alias, cbu FROM usuarios WHERE dni = $1',
      [dni]
    ));
  } else {
    ({ rows } = await pool.query(
      `SELECT id, nombre, apellido, alias, cbu FROM usuarios
       WHERE nombre ILIKE $1 OR apellido ILIKE $1
          OR CONCAT(nombre, ' ', apellido) ILIKE $1
       ORDER BY nombre, apellido LIMIT 8`,
      [`%${nombre}%`]
    ));
  }

  const resultados = rows.filter((r) => r.id !== req.user.id);
  if (resultados.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

  // alias/cbu/dni → objeto único; nombre → array
  res.json(nombre ? resultados : resultados[0]);
}

async function actualizarAlias(req, res) {
  const { alias } = req.body;
  if (!alias || !alias.trim()) return res.status(400).json({ error: 'Alias requerido' });

  const aliasLimpio = alias.trim().toLowerCase();
  if (!/^[a-z0-9]+(\.[a-z0-9]+){1,3}$/.test(aliasLimpio)) {
    return res.status(400).json({ error: 'El alias solo puede tener letras, números y puntos (ej: rio.azul.1234)' });
  }

  const { rowCount } = await pool.query(
    'SELECT 1 FROM usuarios WHERE alias = $1 AND id != $2', [aliasLimpio, req.user.id]
  );
  if (rowCount > 0) return res.status(409).json({ error: 'Ese alias ya está en uso' });

  const { rows } = await pool.query(
    'UPDATE usuarios SET alias = $1 WHERE id = $2 RETURNING alias',
    [aliasLimpio, req.user.id]
  );
  res.json({ alias: rows[0].alias });
}

async function actualizarEmail(req, res) {
  const { email } = req.body;
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email requerido' });

  const emailLimpio = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const { rowCount } = await pool.query(
    'SELECT 1 FROM usuarios WHERE email = $1 AND id != $2', [emailLimpio, req.user.id]
  );
  if (rowCount > 0) return res.status(409).json({ error: 'Ese email ya está en uso' });

  const { rows } = await pool.query(
    'UPDATE usuarios SET email = $1 WHERE id = $2 RETURNING email',
    [emailLimpio, req.user.id]
  );
  res.json({ email: rows[0].email });
}

module.exports = { getMe, buscarUsuario, actualizarAlias, actualizarEmail };
