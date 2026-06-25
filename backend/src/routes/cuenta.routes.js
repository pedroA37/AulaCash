const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getMe, buscarUsuario, actualizarAlias, actualizarEmail } = require('../controllers/cuentaController');
const { transferir, getHistorial } = require('../controllers/transferenciaController');
const { generarQR, infoQR, cobrarQR } = require('../controllers/qrController');

router.get('/me', requireAuth, getMe);
router.get('/buscar', requireAuth, buscarUsuario);
router.patch('/alias', requireAuth, actualizarAlias);
router.patch('/email', requireAuth, actualizarEmail);

router.post('/transferencias', requireAuth, transferir);
router.get('/transacciones', requireAuth, getHistorial);

router.post('/qr/generar', requireAuth, generarQR);
router.get('/qr/:token', requireAuth, infoQR);
router.post('/qr/cobrar', requireAuth, cobrarQR);

module.exports = router;
