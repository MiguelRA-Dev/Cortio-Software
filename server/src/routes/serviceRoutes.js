const express = require('express');
const serviceController = require('../controllers/serviceController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requireRole('owner'), serviceController.create);
router.get('/me', requireAuth, requireRole('owner', 'barber'), serviceController.listMine);
router.patch('/:id', requireAuth, requireRole('owner'), serviceController.update);
router.delete('/:id', requireAuth, requireRole('owner'), serviceController.remove);
router.get('/public/:slug', serviceController.listPublic);

module.exports = router;
