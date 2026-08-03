const express = require('express');
const productController = require('../controllers/productController');
const inventoryController = require('../controllers/inventoryController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.use(requireAuth, requireActiveSubscription);

// Barbers need read access to the catalog to operate the POS.
router.get('/', requireRole('owner', 'barber'), productController.list);

router.use(requireRole('owner'));

router.post('/', productController.create);
router.get('/low-stock', productController.lowStock);
router.patch('/:id', productController.update);

router.post('/:productId/movements', inventoryController.createMovement);
router.get('/:productId/movements', inventoryController.listMovements);

module.exports = router;
