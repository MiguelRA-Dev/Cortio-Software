const express = require('express');
const payrollController = require('../controllers/payrollController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('owner'));

router.get('/preview', payrollController.preview);
router.post('/', payrollController.create);
router.get('/', payrollController.list);
router.patch('/:id/pay', payrollController.markPaid);

module.exports = router;
