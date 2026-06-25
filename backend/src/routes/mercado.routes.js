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
router.get('/:id/productos', requireMercadoParticipant, c.getProductos);
router.post('/:id/comprar', requireMercadoParticipant, c.comprarProducto);
router.delete('/:id/abandonar', requireMercadoParticipant, c.abandonarMercado);

module.exports = router;
