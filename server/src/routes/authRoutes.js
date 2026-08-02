const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/register-barbershop', authController.registerBarbershop);
router.post('/register-customer', authController.registerCustomer);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);
router.post('/register-barber', requireAuth, requireRole('owner'), authController.registerBarber);

module.exports = router;
