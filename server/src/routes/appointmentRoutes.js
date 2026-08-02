const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/availability/:slug', appointmentController.getAvailability);
router.post('/', requireAuth, requireRole('customer'), appointmentController.create);
router.get('/me', requireAuth, appointmentController.listMine);
router.patch('/:id/status', requireAuth, requireRole('owner', 'barber'), appointmentController.updateStatus);

module.exports = router;
