const User = require('../models/User');
const PayrollEntry = require('../models/PayrollEntry');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { calculateGross } = require('../services/payrollService');

async function getBarberOrThrow(barberId, barbershopId) {
  const barber = await User.findOne({ _id: barberId, barbershop: barbershopId, role: 'barber' });
  if (!barber) throw new ApiError(404, 'Barber not found');
  return barber;
}

const preview = asyncHandler(async (req, res) => {
  const { barberId, periodStart, periodEnd } = req.query;
  if (!barberId || !periodStart || !periodEnd) {
    throw new ApiError(400, 'barberId, periodStart and periodEnd are required');
  }

  const barber = await getBarberOrThrow(barberId, req.user.barbershop);
  const result = await calculateGross(barber, new Date(periodStart), new Date(periodEnd));
  res.json({ paymentScheme: barber.paymentScheme, ...result });
});

const create = asyncHandler(async (req, res) => {
  const { barberId, periodStart, periodEnd, netAmount } = req.body;
  if (!barberId || !periodStart || !periodEnd) {
    throw new ApiError(400, 'barberId, periodStart and periodEnd are required');
  }

  const barber = await getBarberOrThrow(barberId, req.user.barbershop);
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const { grossAmount } = await calculateGross(barber, start, end);

  const entry = await PayrollEntry.create({
    barbershop: req.user.barbershop,
    barber: barber._id,
    periodStart: start,
    periodEnd: end,
    grossAmount,
    netAmount: netAmount !== undefined ? netAmount : grossAmount
  });

  res.status(201).json(entry);
});

const list = asyncHandler(async (req, res) => {
  const filter = { barbershop: req.user.barbershop };
  if (req.query.barberId) filter.barber = req.query.barberId;
  if (req.query.status) filter.status = req.query.status;

  const entries = await PayrollEntry.find(filter).sort({ periodStart: -1 }).populate('barber', 'name');
  res.json(entries);
});

const markPaid = asyncHandler(async (req, res) => {
  const entry = await PayrollEntry.findOne({ _id: req.params.id, barbershop: req.user.barbershop });
  if (!entry) {
    throw new ApiError(404, 'Payroll entry not found');
  }
  entry.status = 'paid';
  entry.paidAt = new Date();
  await entry.save();
  res.json(entry);
});

module.exports = { preview, create, list, markPaid };
