const express = require('express');
const timeBlockController = require('../controllers/timeBlockController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.get('/me', requireAuth, requireActiveSubscription, requireRole('owner', 'barber'), timeBlockController.listMine);
router.post('/', requireAuth, requireActiveSubscription, requireRole('barber'), timeBlockController.create);
router.delete('/:id', requireAuth, requireActiveSubscription, requireRole('barber'), timeBlockController.remove);

module.exports = router;
