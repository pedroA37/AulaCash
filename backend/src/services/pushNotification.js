const webpush = require('web-push');
const pool = require('../config/db');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@aulacash.local'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function enviarPush(usuarioId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  const { rows } = await pool.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE usuario_id = $1',
    [usuarioId]
  );

  const payloadStr = JSON.stringify(payload);
  for (const sub of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr
      );
    } catch (err) {
      if (err.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
      }
    }
  }
}

async function enviarPushAMercado(mercadoId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  const { rows } = await pool.query(
    `SELECT DISTINCT ps.endpoint, ps.p256dh, ps.auth
     FROM push_subscriptions ps
     JOIN mercado_usuarios mu ON mu.usuario_id = ps.usuario_id
     WHERE mu.mercado_id = $1`,
    [mercadoId]
  );

  const payloadStr = JSON.stringify(payload);
  for (const sub of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr
      );
    } catch (err) {
      if (err.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
      }
    }
  }
}

module.exports = { enviarPush, enviarPushAMercado };
