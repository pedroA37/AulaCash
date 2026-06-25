const pool = require('../config/db');

async function requireMercadoAdmin(req, res, next) {
  const mercadoId = req.params.id || req.params.mercadoId;
  const { rows } = await pool.query('SELECT admin_id FROM mercados WHERE id = $1', [mercadoId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Mercado no encontrado' });
  if (rows[0].admin_id !== req.user.id) {
    return res.status(403).json({ error: 'No sos el administrador de este mercado' });
  }
  req.mercado = rows[0];
  next();
}

async function requirePseudoAdmin(req, res, next) {
  const mercadoId = req.params.id || req.params.mercadoId;
  const { rows: m } = await pool.query('SELECT id, admin_id FROM mercados WHERE id = $1', [mercadoId]);
  if (m.length === 0) return res.status(404).json({ error: 'Mercado no encontrado' });

  if (m[0].admin_id === req.user.id) { req.mercado = m[0]; return next(); }

  const { rowCount } = await pool.query(
    'SELECT 1 FROM mercado_pseudo_admins WHERE mercado_id = $1 AND usuario_id = $2',
    [mercadoId, req.user.id]
  );
  if (rowCount === 0) return res.status(403).json({ error: 'Acceso restringido a pseudo-administradores' });
  req.mercado = m[0];
  next();
}

async function requireMercadoParticipant(req, res, next) {
  const mercadoId = req.params.id || req.params.mercadoId;
  const { rows } = await pool.query(
    `SELECT mu.saldo, m.estado, m.nombre, mo.nombre AS moneda_nombre, mo.acronimo AS moneda_acronimo,
            m.admin_id, m.hora_cierre, m.notificacion_30_enviada
     FROM mercado_usuarios mu
     JOIN mercados m ON m.id = mu.mercado_id
     JOIN monedas mo ON mo.id = m.moneda_id
     WHERE mu.mercado_id = $1 AND mu.usuario_id = $2`,
    [mercadoId, req.user.id]
  );
  if (rows.length === 0) return res.status(403).json({ error: 'No participás en este mercado' });
  req.mercadoParticipant = rows[0];
  next();
}

module.exports = { requireMercadoAdmin, requirePseudoAdmin, requireMercadoParticipant };
