const express = require('express');
const customerController = require('../controllers/customerController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('owner'), customerController.list);

module.exports = router;
