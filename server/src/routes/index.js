const express = require('express');
const authRoutes = require('./authRoutes');
const barbershopRoutes = require('./barbershopRoutes');
const barberRoutes = require('./barberRoutes');
const serviceRoutes = require('./serviceRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const productRoutes = require('./productRoutes');
const saleRoutes = require('./saleRoutes');
const expenseRoutes = require('./expenseRoutes');
const payrollRoutes = require('./payrollRoutes');
const reportRoutes = require('./reportRoutes');
const customerRoutes = require('./customerRoutes');
const billingRoutes = require('./billingRoutes');
const portfolioRoutes = require('./portfolioRoutes');
const reviewRoutes = require('./reviewRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/billing', billingRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/reviews', reviewRoutes);
router.use('/barbershops', barbershopRoutes);
router.use('/barbers', barberRoutes);
router.use('/services', serviceRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/products', productRoutes);
router.use('/sales', saleRoutes);
router.use('/expenses', expenseRoutes);
router.use('/payroll', payrollRoutes);
router.use('/reports', reportRoutes);
router.use('/customers', customerRoutes);

module.exports = router;
