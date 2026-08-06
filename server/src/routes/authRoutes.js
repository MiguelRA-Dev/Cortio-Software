const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register-barbershop', authLimiter, authController.registerBarbershop);
router.post('/register-customer', authLimiter, authController.registerCustomer);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/google', authLimiter, authController.googleLogin);
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, authController.updateMe);
router.post('/register-barber', requireAuth, requireRole('owner'), authController.registerBarber);
router.post('/verify-email', authLimiter, authController.verifyEmail);
router.post('/resend-verification', requireAuth, authLimiter, authController.resendVerification);

module.exports = router;
