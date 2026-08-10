const express = require('express');
const customerController = require('../controllers/customerController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.get('/', requireAuth, requireActiveSubscription, requireRole('owner', 'barber'), customerController.list);
router.post('/', requireAuth, requireActiveSubscription, requireRole('owner', 'barber'), customerController.create);

module.exports = router;
