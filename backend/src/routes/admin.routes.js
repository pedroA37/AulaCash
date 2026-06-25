const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const {
  listarUsuarios, getUsuario, getMercadosUsuario,
  getTransaccionesUsuario, cargarSaldo,
  eliminarUsuario, cambiarRol, crearAdmin,
} = require('../controllers/adminController');

router.get('/usuarios', requireAdmin, listarUsuarios);
router.get('/usuarios/:id', requireAdmin, getUsuario);
router.get('/usuarios/:id/mercados', requireAdmin, getMercadosUsuario);
router.get('/usuarios/:id/transacciones', requireAdmin, getTransaccionesUsuario);
router.post('/cargar-saldo', requireAdmin, cargarSaldo);
router.delete('/usuarios/:id', requireAdmin, eliminarUsuario);
router.patch('/usuarios/:id/rol', requireAdmin, cambiarRol);
router.post('/crear-admin', requireAdmin, crearAdmin);

module.exports = router;
