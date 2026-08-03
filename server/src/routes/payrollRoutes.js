const express = require('express');
const payrollController = require('../controllers/payrollController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');

const router = express.Router();

router.use(requireAuth, requireActiveSubscription);

router.get('/preview', requireRole('owner'), payrollController.preview);
router.get('/', requireRole('owner', 'barber'), payrollController.list);
router.get('/:id', requireRole('owner', 'barber'), payrollController.getById);
router.post('/', requireRole('owner'), payrollController.create);
router.patch('/:id', requireRole('owner'), payrollController.update);
router.patch('/:id/pay', requireRole('owner'), payrollController.markPaid);
router.delete('/:id', requireRole('owner'), payrollController.remove);

module.exports = router;
