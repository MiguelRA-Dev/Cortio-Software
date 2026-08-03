const express = require('express');
const billingController = require('../controllers/billingController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Called by Wompi's servers directly — no session, protected by signature verification instead.
router.post('/webhook', billingController.handleWebhook);

router.get('/status', requireAuth, requireRole('owner', 'barber'), billingController.getStatus);
router.post('/payment-method', requireAuth, requireRole('owner'), billingController.attachPaymentMethod);

module.exports = router;
