const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMercadoParticipant } = require('../middleware/mercadoAuth');
const c = require('../controllers/mercadoController');

router.use(requireAuth);

router.get('/mis-mercados', c.misMercados);
router.get('/info/:codigo', c.infoPorCodigo);
router.post('/unirse', c.unirseAlMercado);

router.get('/:id', requireMercadoParticipant, c.getMercado);
router.get('/:id/participantes', requireMercadoParticipant, c.getParticipantes);
router.post('/:id/transferir', requireMercadoParticipant, c.transferirEnMercado);
router.get('/:id/transacciones', requireMercadoParticipant, c.getTransacciones);

// Catálogo
router.get('/:id/productos', requireMercadoParticipant, c.getProductos);
router.get('/:id/productos/:pid', requireMercadoParticipant, c.getProducto);

// Mis productos (cualquier participante puede subir los suyos)
router.get('/:id/mis-productos', requireMercadoParticipant, c.getMisProductos);
router.post('/:id/mis-productos', requireMercadoParticipant, c.crearMiProducto);
router.patch('/:id/mis-productos/:pid', requireMercadoParticipant, c.actualizarMiProducto);
router.delete('/:id/mis-productos/:pid', requireMercadoParticipant, c.eliminarMiProducto);

// Compras
router.post('/:id/comprar', requireMercadoParticipant, c.comprarProducto);
router.post('/:id/carrito', requireMercadoParticipant, c.comprarCarrito);

// Pedidos
router.get('/:id/pedidos', requireMercadoParticipant, c.getPedidos);

router.delete('/:id/abandonar', requireMercadoParticipant, c.abandonarMercado);

module.exports = router;
