const express = require('express');
const barbershopController = require('../controllers/barbershopController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createImageUploader } = require('../middleware/upload');

const router = express.Router();
const uploadLogo = createImageUploader('logos');

router.get('/me', requireAuth, requireRole('owner'), barbershopController.getMe);
router.patch('/me', requireAuth, requireRole('owner'), barbershopController.updateMe);
router.post('/me/logo', requireAuth, requireRole('owner'), uploadLogo.single('logo'), barbershopController.uploadLogo);
router.post('/me/request-deletion', requireAuth, requireRole('owner'), barbershopController.requestDeletion);
router.post('/me/cancel-deletion', requireAuth, requireRole('owner'), barbershopController.cancelDeletion);
router.get('/:slug', barbershopController.getBySlug);

module.exports = router;
