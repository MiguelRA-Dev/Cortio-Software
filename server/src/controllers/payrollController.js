const User = require('../models/User');
const PayrollEntry = require('../models/PayrollEntry');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { calculateGross } = require('../services/payrollService');

const LINE_TYPES = ['bonus', 'deduction'];
const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'other'];

async function getBarberOrThrow(barberId, barbershopId) {
  const barber = await User.findOne({ _id: barberId, barbershop: barbershopId, role: 'barber' });
  if (!barber) throw new ApiError(404, 'Barber not found');
  return barber;
}

function normalizeLines(lines) {
  if (lines === undefined) return [];
  if (!Array.isArray(lines)) throw new ApiError(400, 'lines must be an array');
  return lines.map((line) => {
    const { type, label, amount } = line || {};
    if (!LINE_TYPES.includes(type)) {
      throw new ApiError(400, `line type must be one of: ${LINE_TYPES.join(', ')}`);
    }
    if (!label || !String(label).trim()) {
      throw new ApiError(400, 'Every line needs a label');
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      throw new ApiError(400, 'Every line needs a non-negative amount');
    }
    return { type, label: String(label).trim(), amount: numericAmount };
  });
}

function computeNet(grossAmount, lines) {
  const bonuses = lines.filter((l) => l.type === 'bonus').reduce((sum, l) => sum + l.amount, 0);
  const deductions = lines.filter((l) => l.type === 'deduction').reduce((sum, l) => sum + l.amount, 0);
  const net = grossAmount + bonuses - deductions;
  if (net < 0) {
    throw new ApiError(400, 'Deductions cannot exceed the gross amount plus bonuses');
  }
  return net;
}

async function assertNoOverlap({ barbershop, barberId, start, end, excludeId }) {
  const filter = {
    barbershop,
    barber: barberId,
    periodStart: { $lte: end },
    periodEnd: { $gte: start }
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const conflict = await PayrollEntry.findOne(filter);
  if (conflict) {
    throw new ApiError(409, 'This barber already has a payroll entry covering part of that period');
  }
}

function parsePeriod(periodStart, periodEnd) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new ApiError(400, 'Invalid period: periodStart must be before periodEnd');
  }
  return { start, end };
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
  const { barberId, periodStart, periodEnd, lines } = req.body;
  if (!barberId || !periodStart || !periodEnd) {
    throw new ApiError(400, 'barberId, periodStart and periodEnd are required');
  }

  const { start, end } = parsePeriod(periodStart, periodEnd);
  const barber = await getBarberOrThrow(barberId, req.user.barbershop);
  await assertNoOverlap({ barbershop: req.user.barbershop, barberId: barber._id, start, end });

  const normalizedLines = normalizeLines(lines);
  const { grossAmount, saleIds } = await calculateGross(barber, start, end);
  const netAmount = computeNet(grossAmount, normalizedLines);

  const entry = await PayrollEntry.create({
    barbershop: req.user.barbershop,
    barber: barber._id,
    periodStart: start,
    periodEnd: end,
    grossAmount,
    lines: normalizedLines,
    netAmount,
    sales: saleIds
  });

  await entry.populate('barber', 'name');
  res.status(201).json(entry);
});

const update = asyncHandler(async (req, res) => {
  const entry = await PayrollEntry.findOne({ _id: req.params.id, barbershop: req.user.barbershop });
  if (!entry) {
    throw new ApiError(404, 'Payroll entry not found');
  }
  if (entry.status !== 'pending') {
    throw new ApiError(409, 'Only pending payroll entries can be edited');
  }

  const { barberId, periodStart, periodEnd, lines } = req.body;
  const barber = barberId ? await getBarberOrThrow(barberId, req.user.barbershop) : await User.findById(entry.barber);
  const { start, end } = parsePeriod(periodStart || entry.periodStart, periodEnd || entry.periodEnd);

  await assertNoOverlap({
    barbershop: req.user.barbershop,
    barberId: barber._id,
    start,
    end,
    excludeId: entry._id
  });

  const normalizedLines = lines !== undefined ? normalizeLines(lines) : entry.lines;
  const { grossAmount, saleIds } = await calculateGross(barber, start, end);
  const netAmount = computeNet(grossAmount, normalizedLines);

  entry.barber = barber._id;
  entry.periodStart = start;
  entry.periodEnd = end;
  entry.lines = normalizedLines;
  entry.grossAmount = grossAmount;
  entry.netAmount = netAmount;
  entry.sales = saleIds;
  await entry.save();
  await entry.populate('barber', 'name');

  res.json(entry);
});

const remove = asyncHandler(async (req, res) => {
  const entry = await PayrollEntry.findOne({ _id: req.params.id, barbershop: req.user.barbershop });
  if (!entry) {
    throw new ApiError(404, 'Payroll entry not found');
  }
  if (entry.status !== 'pending') {
    throw new ApiError(409, 'Only pending payroll entries can be deleted');
  }
  await entry.deleteOne();
  res.status(204).send();
});

const list = asyncHandler(async (req, res) => {
  const filter = { barbershop: req.user.barbershop };
  if (req.user.role === 'barber') {
    filter.barber = req.user._id;
  } else if (req.query.barberId) {
    filter.barber = req.query.barberId;
  }
  if (req.query.status) filter.status = req.query.status;
  // A period "overlaps" the requested range if it starts before the range ends
  // and ends after the range starts.
  if (req.query.from) filter.periodEnd = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.periodStart = { $lte: new Date(req.query.to) };

  const entries = await PayrollEntry.find(filter).sort({ periodStart: -1 }).populate('barber', 'name');
  res.json(entries);
});

const getById = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, barbershop: req.user.barbershop };
  if (req.user.role === 'barber') {
    filter.barber = req.user._id;
  }

  const entry = await PayrollEntry.findOne(filter)
    .populate('barber', 'name')
    .populate({ path: 'sales', select: 'items total createdAt source' });
  if (!entry) {
    throw new ApiError(404, 'Payroll entry not found');
  }
  res.json(entry);
});

const markPaid = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(400, `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
  }

  const entry = await PayrollEntry.findOne({ _id: req.params.id, barbershop: req.user.barbershop });
  if (!entry) {
    throw new ApiError(404, 'Payroll entry not found');
  }
  if (entry.status === 'paid') {
    throw new ApiError(409, 'This payroll entry is already paid');
  }
  entry.status = 'paid';
  entry.paymentMethod = paymentMethod;
  entry.paidAt = new Date();
  await entry.save();
  res.json(entry);
});

module.exports = { preview, create, update, remove, list, getById, markPaid };
