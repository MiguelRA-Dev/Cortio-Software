const express = require('express');
const barberController = require('../controllers/barberController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');
const { createImageUploader } = require('../middleware/upload');

const router = express.Router();
const uploadAvatar = createImageUploader('avatars');

router.get('/me/team', requireAuth, requireActiveSubscription, requireRole('owner', 'barber'), barberController.listMyTeam);
router.patch('/:id', requireAuth, requireActiveSubscription, requireRole('owner'), barberController.updateBarber);
router.post(
  '/:id/avatar',
  requireAuth,
  requireActiveSubscription,
  requireRole('owner', 'barber'),
  uploadAvatar.single('avatar'),
  barberController.uploadAvatar
);
router.get('/public/:slug', barberController.listPublicBarbers);

module.exports = router;
