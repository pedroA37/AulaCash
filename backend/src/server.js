require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // Necesario para rate limiting correcto detrás de Render/Vercel

app.use(helmet());
app.use(compression({ threshold: 1024 }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Límites generosos para entorno aula (200 alumnos pueden compartir un mismo IP de WiFi)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
const apiLimiter  = rateLimit({ windowMs: 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Rutas
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/cuenta', require('./routes/cuenta.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/admin/mercados', require('./routes/admin.mercado.routes'));
app.use('/api/mercados', require('./routes/mercado.routes'));
app.use('/api/pseudo-admin', require('./routes/pseudoadmin.routes'));
app.use('/api/notifications', require('./routes/notificaciones.routes'));

// Scheduler de mercados (verifica cierres próximos)
require('./services/scheduler');

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
