const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Barbershop = require('../models/Barbershop');
const Service = require('../models/Service');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const { sendVerificationEmail } = require('../services/emailService');

// Lazy singleton: constructed on first use rather than at module load, so a missing
// GOOGLE_CLIENT_ID surfaces as a clean 500 from the route instead of crashing the
// whole process at require-time (this file loads even when Google sign-in is unused).
let googleClient;
function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(500, 'Google sign-in is not configured (missing GOOGLE_CLIENT_ID)');
  }
  if (!googleClient) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

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
    email: rawEmail,
    password,
    confirmPassword,
    phone,
    barbershopName,
    slug,
    location,
    address,
    addressDetails,
    serviceCategories,
    googleCredential
  } = req.body;

  if (!ownerName || !barbershopName || !slug) {
    throw new ApiError(400, 'ownerName, barbershopName and slug are required');
  }

  // Two ways to prove ownership of the email: a password pair, or a verified Google
  // credential. Google already vouches for the email, so those accounts skip both the
  // password and the separate verification-email step.
  let email;
  let passwordHash;
  let emailVerified = false;

  if (googleCredential) {
    let payload;
    try {
      const ticket = await getGoogleClient().verifyIdToken({
        idToken: googleCredential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (err) {
      throw new ApiError(401, 'Invalid Google credential');
    }
    if (!payload?.email || !payload.email_verified) {
      throw new ApiError(401, 'Your Google account email is not verified');
    }
    email = payload.email.toLowerCase();
    emailVerified = true;
    // Never used to log in (Google is the only path in from here on) — it only exists
    // because passwordHash is a required field on the User schema.
    passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
  } else {
    if (!rawEmail || !password) {
      throw new ApiError(400, 'email and password are required');
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new ApiError(400, 'password and confirmPassword do not match');
    }
    email = rawEmail.toLowerCase();
    passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const normalizedSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');
  if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
    throw new ApiError(400, 'slug may only contain lowercase letters, numbers and hyphens');
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new ApiError(409, 'Email already in use');
  }
  const existingSlug = await Barbershop.findOne({ slug: normalizedSlug });
  if (existingSlug) {
    throw new ApiError(409, 'slug already in use');
  }

  const owner = await User.create({ name: ownerName, email, passwordHash, phone, role: 'owner', emailVerified });

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

  // Google already verified this email — no need to also send our own verification link.
  if (!emailVerified) {
    // Best-effort: a flaky email provider shouldn't block account creation.
    await issueVerificationEmail(owner).catch((err) => console.error('[auth] Failed to send verification email:', err));
  }

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

// Google only authenticates an existing account here — it doesn't create one. Letting
// a Google credential silently create a barbershop owner would skip the registration
// wizard (shop name, slug, address) with no way to collect that data mid-flow.
const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    throw new ApiError(400, 'credential is required');
  }

  let payload;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw new ApiError(401, 'Invalid Google credential');
  }

  if (!payload?.email || !payload.email_verified) {
    throw new ApiError(401, 'Your Google account email is not verified');
  }

  const user = await User.findOne({ email: payload.email.toLowerCase() });
  if (!user || !user.active) {
    throw new ApiError(404, 'No existe una cuenta con este correo. Regístrate primero.');
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
  googleLogin,
  me,
  updateMe,
  verifyEmail,
  resendVerification
};
