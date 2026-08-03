const express = require('express');
const reviewController = require('../controllers/reviewController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requireRole('customer'), reviewController.create);
router.get('/mine', requireAuth, requireRole('customer'), reviewController.listMine);

module.exports = router;
