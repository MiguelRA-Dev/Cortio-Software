const express = require('express');
const portfolioController = require('../controllers/portfolioController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');
const { createImageUploader } = require('../middleware/upload');

const router = express.Router();
const uploadPhoto = createImageUploader('portfolio');

router.get('/public/:slug', portfolioController.listPublic);
router.get(
  '/mine',
  requireAuth,
  requireActiveSubscription,
  requireRole('barber', 'owner'),
  portfolioController.listMine
);
router.get(
  '/barber/:barberId',
  requireAuth,
  requireActiveSubscription,
  requireRole('owner'),
  portfolioController.listByBarber
);
router.post(
  '/',
  requireAuth,
  requireActiveSubscription,
  requireRole('barber', 'owner'),
  uploadPhoto.single('photo'),
  portfolioController.create
);
router.delete(
  '/:id',
  requireAuth,
  requireActiveSubscription,
  requireRole('owner', 'barber'),
  portfolioController.remove
);

module.exports = router;
