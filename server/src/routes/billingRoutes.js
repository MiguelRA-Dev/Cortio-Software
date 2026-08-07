const express = require('express');
const billingController = require('../controllers/billingController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Called by MercadoPago's servers directly — no session, protected by signature verification instead.
router.post('/webhook', billingController.handleWebhook);

router.get('/status', requireAuth, requireRole('owner', 'barber'), billingController.getStatus);
router.post('/checkout', requireAuth, requireRole('owner'), billingController.startCheckout);

module.exports = router;
