const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Barbershop = require('../models/Barbershop');
const Service = require('../models/Service');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const { sendVerificationEmail } = require('../services/emailService');

const SALT_ROUNDS = 10;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function sanitizeUser(user) {
  const obj = user.toObject();
  delete obj.passwordHash;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  return obj;
}

async function issueVerificationEmail(user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = token;
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await user.save();

  // The token is saved regardless — sending is best-effort so a misconfigured or flaky
  // email provider never turns into a 500 for the caller (registration, resend button).
  try {
    const appUrl = process.env.APP_URL || '';
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl: `${appUrl}/verify-email/${token}`
    });
  } catch (err) {
    console.error('[auth] Failed to send verification email:', err.message);
  }
}

const registerBarbershop = asyncHandler(async (req, res) => {
  const {
    ownerName,
    email,
    password,
    confirmPassword,
    phone,
    barbershopName,
    slug,
    location,
    address,
    addressDetails,
    serviceCategories
  } = req.body;

  if (!ownerName || !email || !password || !barbershopName || !slug) {
    throw new ApiError(400, 'ownerName, email, password, barbershopName and slug are required');
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw new ApiError(400, 'password and confirmPassword do not match');
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

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  let barbershop;
  try {
    barbershop = await Barbershop.create({
      name: barbershopName,
      owner: owner._id,
      slug: normalizedSlug,
      location,
      address,
      addressDetails,
      subscriptionStatus: 'trialing',
      trialEndsAt
    });
  } catch (err) {
    await User.findByIdAndDelete(owner._id);
    throw err;
  }

  owner.barbershop = barbershop._id;
  await owner.save();

  if (Array.isArray(serviceCategories) && serviceCategories.length > 0) {
    await Service.insertMany(
      serviceCategories.map((category) => ({
        barbershop: barbershop._id,
        name: category,
        category,
        durationMinutes: 30,
        price: 0,
        // Left inactive on purpose — they're starter placeholders, not real bookable
        // services, until the owner sets a real price from Servicios.
        active: false
      }))
    );
  }

  // Best-effort: a flaky email provider shouldn't block account creation.
  await issueVerificationEmail(owner).catch((err) => console.error('[auth] Failed to send verification email:', err));

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

const updateMe = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  const updates = {};

  if (name !== undefined) {
    if (!name.trim()) throw new ApiError(400, 'name cannot be empty');
    updates.name = name.trim();
  }
  if (phone !== undefined) {
    updates.phone = phone;
  }
  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) throw new ApiError(400, 'email cannot be empty');
    if (normalizedEmail !== req.user.email) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) throw new ApiError(409, 'Email already in use');
      // A changed email is unverified until it's confirmed again.
      updates.emailVerified = false;
    }
    updates.email = normalizedEmail;
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json(sanitizeUser(user));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw new ApiError(400, 'token is required');
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() }
  });
  if (!user) {
    throw new ApiError(400, 'This verification link is invalid or has expired');
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json(sanitizeUser(user));
});

const resendVerification = asyncHandler(async (req, res) => {
  if (req.user.emailVerified) {
    throw new ApiError(409, 'This email is already verified');
  }
  await issueVerificationEmail(req.user);
  res.json({ sent: true });
});

module.exports = {
  registerBarbershop,
  registerBarber,
  registerCustomer,
  login,
  me,
  updateMe,
  verifyEmail,
  resendVerification
};
