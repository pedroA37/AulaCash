const cron = require('node-cron');
const pool = require('../config/db');
const { enviarPushAMercado } = require('./pushNotification');

cron.schedule('* * * * *', async () => {
  try {
    const { rows: mercados } = await pool.query(
      `SELECT id, nombre
       FROM mercados
       WHERE estado = 'abierto'
         AND hora_cierre IS NOT NULL
         AND hora_cierre - NOW() <= INTERVAL '30 minutes'
         AND hora_cierre - NOW() > INTERVAL '0 minutes'
         AND notificacion_30_enviada = false`
    );

    for (const m of mercados) {
      await pool.query(
        'UPDATE mercados SET notificacion_30_enviada = true WHERE id = $1',
        [m.id]
      );

      await enviarPushAMercado(m.id, {
        title: `⚠️ ${m.nombre} cierra pronto`,
        body: 'Quedan menos de 30 minutos. ¡Cambiá tu dinero por bienes!',
        mercado_id: m.id,
      });
    }
  } catch (err) {
    console.error('[scheduler] Error en cron de mercados:', err.message);
  }
});

console.log('[scheduler] Cron de mercados iniciado');
