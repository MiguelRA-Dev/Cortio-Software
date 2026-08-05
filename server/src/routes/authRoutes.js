const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/register-barbershop', authController.registerBarbershop);
router.post('/register-customer', authController.registerCustomer);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, authController.updateMe);
router.post('/register-barber', requireAuth, requireRole('owner'), authController.registerBarber);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', requireAuth, authController.resendVerification);

module.exports = router;
