require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

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
