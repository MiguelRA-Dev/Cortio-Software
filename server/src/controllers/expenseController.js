const Expense = require('../models/Expense');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const { category, amount, description, date } = req.body;
  if (!category || amount === undefined) {
    throw new ApiError(400, 'category and amount are required');
  }

  const expense = await Expense.create({
    barbershop: req.user.barbershop,
    category,
    amount,
    description,
    date,
    createdBy: req.user._id
  });
  res.status(201).json(expense);
});

const list = asyncHandler(async (req, res) => {
  const filter = { barbershop: req.user.barbershop };
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }

  const expenses = await Expense.find(filter).sort({ date: -1 });
  res.json(expenses);
});

const ALLOWED_UPDATE_FIELDS = ['category', 'amount', 'description', 'date'];

const update = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, barbershop: req.user.barbershop });
  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }

  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      expense[field] = req.body[field];
    }
  }
  await expense.save();
  res.json(expense);
});

const remove = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, barbershop: req.user.barbershop });
  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }
  res.json({ success: true });
});

module.exports = { create, list, update, remove };
