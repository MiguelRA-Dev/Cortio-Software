const express = require('express');
const expenseController = require('../controllers/expenseController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.use(requireAuth, requireActiveSubscription, requireRole('owner'));

router.post('/', expenseController.create);
router.get('/', expenseController.list);
router.patch('/:id', expenseController.update);
router.delete('/:id', expenseController.remove);

module.exports = router;
