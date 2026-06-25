const pool = require('../config/db');

async function subscribe(req, res) {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }

  await pool.query(
    `INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
    [req.user.id, endpoint, keys.p256dh, keys.auth]
  );
  res.status(201).json({ ok: true });
}

async function unsubscribe(req, res) {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint es requerido' });
  await pool.query(
    'DELETE FROM push_subscriptions WHERE endpoint = $1 AND usuario_id = $2',
    [endpoint, req.user.id]
  );
  res.json({ ok: true });
}

async function getVapidPublicKey(req, res) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

module.exports = { subscribe, unsubscribe, getVapidPublicKey };
