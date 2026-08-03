const express = require('express');
const saleController = require('../controllers/saleController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.use(requireAuth, requireActiveSubscription, requireRole('owner', 'barber'));

router.post('/', saleController.create);
router.get('/', saleController.list);
router.get('/:id', saleController.getById);

module.exports = router;
