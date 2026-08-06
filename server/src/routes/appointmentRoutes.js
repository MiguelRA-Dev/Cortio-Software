const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.get('/availability/:slug', appointmentController.getAvailability);
router.post('/', requireAuth, requireRole('customer'), appointmentController.create);
router.get('/me', requireAuth, requireActiveSubscription, appointmentController.listMine);
router.patch('/:id/status', requireAuth, requireActiveSubscription, requireRole('owner', 'barber'), appointmentController.updateStatus);
router.patch('/:id/cancel', requireAuth, requireRole('customer'), appointmentController.cancelMine);
router.patch('/:id/reschedule', requireAuth, requireActiveSubscription, requireRole('owner', 'barber'), appointmentController.reschedule);

module.exports = router;
