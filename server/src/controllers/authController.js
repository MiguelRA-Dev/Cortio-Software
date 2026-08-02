const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Barbershop = require('../models/Barbershop');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

function sanitizeUser(user) {
  const obj = user.toObject();
  delete obj.passwordHash;
  return obj;
}

const registerBarbershop = asyncHandler(async (req, res) => {
  const { ownerName, email, password, phone, barbershopName, slug, address } = req.body;

  if (!ownerName || !email || !password || !barbershopName || !slug) {
    throw new ApiError(400, 'ownerName, email, password, barbershopName and slug are required');
  }

  const normalizedSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');
  if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
    throw new ApiError(400, 'slug may only contain lowercase letters, numbers and hyphens');
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw new ApiError(409, 'Email already in use');
  }
  const existingSlug = await Barbershop.findOne({ slug: normalizedSlug });
  if (existingSlug) {
    throw new ApiError(409, 'slug already in use');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const owner = await User.create({ name: ownerName, email, passwordHash, phone, role: 'owner' });

  let barbershop;
  try {
    barbershop = await Barbershop.create({ name: barbershopName, owner: owner._id, slug: normalizedSlug, address });
  } catch (err) {
    await User.findByIdAndDelete(owner._id);
    throw err;
  }

  owner.barbershop = barbershop._id;
  await owner.save();

  const token = signToken(owner);
  res.status(201).json({ token, user: sanitizeUser(owner), barbershop });
});

const registerBarber = asyncHandler(async (req, res) => {
  const { name, email, password, phone, paymentScheme, commissionRate, baseSalary, schedule } = req.body;

  if (!name || !email || !password || !paymentScheme) {
    throw new ApiError(400, 'name, email, password and paymentScheme are required');
  }
  if (!['commission', 'fixed', 'mixed'].includes(paymentScheme)) {
    throw new ApiError(400, 'paymentScheme must be commission, fixed or mixed');
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw new ApiError(409, 'Email already in use');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const barber = await User.create({
    name,
    email,
    passwordHash,
    phone,
    role: 'barber',
    barbershop: req.user.barbershop,
    paymentScheme,
    commissionRate,
    baseSalary,
    schedule
  });

  res.status(201).json(sanitizeUser(barber));
});

const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'name, email and password are required');
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw new ApiError(409, 'Email already in use');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const customer = await User.create({ name, email, passwordHash, phone, role: 'customer' });

  const token = signToken(customer);
  res.status(201).json({ token, user: sanitizeUser(customer) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.active) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = signToken(user);
  res.json({ token, user: sanitizeUser(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json(sanitizeUser(req.user));
});

module.exports = { registerBarbershop, registerBarber, registerCustomer, login, me };
