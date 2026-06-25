const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/notificacionesController');

router.get('/vapid-key', requireAuth, c.getVapidPublicKey);
router.post('/subscribe', requireAuth, c.subscribe);
router.delete('/subscribe', requireAuth, c.unsubscribe);

module.exports = router;
