const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requirePseudoAdmin } = require('../middleware/mercadoAuth');
const c = require('../controllers/pseudoadminController');

router.use(requireAuth);

router.get('/mercados', c.misMercados);
router.get('/mercados/:id/participantes', requirePseudoAdmin, c.getParticipantes);
router.post('/mercados/:id/cargar', requirePseudoAdmin, c.cargarSaldo);

module.exports = router;
