const express = require('express');
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.use(requireAuth, requireActiveSubscription, requireRole('owner'));

router.get('/summary', reportController.summary);
router.get('/by-barber', reportController.byBarber);
router.get('/by-service', reportController.byService);
router.get('/cancellations', reportController.cancellations);
router.get('/ratings', reportController.ratings);
router.get('/recent-reviews', reportController.recentReviews);

module.exports = router;
