const express = require('express');
const barberController = require('../controllers/barberController');
const { requireAuth, requireRole } = require('../middleware/auth');
const uploadAvatar = require('../middleware/upload');

const router = express.Router();

router.get('/me/team', requireAuth, requireRole('owner', 'barber'), barberController.listMyTeam);
router.patch('/:id', requireAuth, requireRole('owner'), barberController.updateBarber);
router.post(
  '/:id/avatar',
  requireAuth,
  requireRole('owner'),
  uploadAvatar.single('avatar'),
  barberController.uploadAvatar
);
router.get('/public/:slug', barberController.listPublicBarbers);

module.exports = router;
