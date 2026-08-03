const express = require('express');
const serviceController = require('../controllers/serviceController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.post('/', requireAuth, requireActiveSubscription, requireRole('owner'), serviceController.create);
router.get('/me', requireAuth, requireActiveSubscription, requireRole('owner', 'barber'), serviceController.listMine);
router.patch('/:id', requireAuth, requireActiveSubscription, requireRole('owner'), serviceController.update);
router.delete('/:id', requireAuth, requireActiveSubscription, requireRole('owner'), serviceController.remove);
router.get('/public/:slug', serviceController.listPublic);

module.exports = router;
