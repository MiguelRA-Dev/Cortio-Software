const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getCustomers } = require('../services/customerService');

const SALT_ROUNDS = 10;

const list = asyncHandler(async (req, res) => {
  const customers = await getCustomers(req.user.barbershop);
  res.json(customers);
});

// For customers who won't self-register — an older client who refuses the app, a true
// walk-in. Staff creates a bare-minimum record (name/phone, no email or login) so they
// can still be picked as the customer on a sale. No `barbershop` field here on purpose:
// customer identity is already global in this app (the same person can book at any
// shop) — this one is simply invisible to Cortio's login/notification flows since it
// has neither an email nor a real password.
const create = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !name.trim()) {
    throw new ApiError(400, 'name es requerido');
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
  const customer = await User.create({
    name: name.trim(),
    phone: phone?.trim() || undefined,
    passwordHash,
    role: 'customer'
  });

  res.status(201).json({ _id: customer._id, name: customer.name, phone: customer.phone });
});

module.exports = { list, create };
