const express = require('express');
const customerController = require('../controllers/customerController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.get('/', requireAuth, requireActiveSubscription, requireRole('owner'), customerController.list);

module.exports = router;
