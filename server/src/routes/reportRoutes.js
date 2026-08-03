const express = require('express');
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.use(requireAuth, requireActiveSubscription, requireRole('owner'));

router.get('/summary', reportController.summary);
router.get('/by-barber', reportController.byBarber);
router.get('/by-service', reportController.byService);

module.exports = router;
