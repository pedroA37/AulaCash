const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMercadoAdmin } = require('../middleware/mercadoAuth');
const c = require('../controllers/adminMercadoController');

router.use(requireAuth);

router.post('/', c.crearMercado);
router.get('/', c.listarMercados);
router.get('/:id', requireMercadoAdmin, c.getMercado);
router.patch('/:id', requireMercadoAdmin, c.actualizarMercado);
router.delete('/:id', requireMercadoAdmin, c.eliminarMercado);
router.post('/:id/abrir', requireMercadoAdmin, c.abrirMercado);
router.post('/:id/cerrar', requireMercadoAdmin, c.cerrarMercado);
router.post('/:id/pseudo-admins', requireMercadoAdmin, c.agregarPseudoAdmin);
router.delete('/:id/pseudo-admins/:uid', requireMercadoAdmin, c.removerPseudoAdmin);
router.get('/:id/sumas-saldos', requireMercadoAdmin, c.getSumasSaldos);

router.get('/:id/productos', requireMercadoAdmin, c.listarProductos);
router.post('/:id/productos', requireMercadoAdmin, c.crearProducto);
router.patch('/:id/productos/:pid', requireMercadoAdmin, c.actualizarProducto);
router.delete('/:id/productos/:pid', requireMercadoAdmin, c.eliminarProducto);

module.exports = router;
