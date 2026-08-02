const express = require('express');
const barbershopController = require('../controllers/barbershopController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, requireRole('owner'), barbershopController.getMe);
router.patch('/me', requireAuth, requireRole('owner'), barbershopController.updateMe);
router.get('/:slug', barbershopController.getBySlug);

module.exports = router;
