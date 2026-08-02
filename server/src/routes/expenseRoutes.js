const express = require('express');
const expenseController = require('../controllers/expenseController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('owner'));

router.post('/', expenseController.create);
router.get('/', expenseController.list);
router.patch('/:id', expenseController.update);
router.delete('/:id', expenseController.remove);

module.exports = router;
