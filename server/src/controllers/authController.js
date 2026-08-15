const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Barbershop = require('../models/Barbershop');
const Service = require('../models/Service');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

// Lazy singleton: constructed on first use rather than at module load, so a missing
// GOOGLE_CLIENT_ID surfaces as a clean 500 from the route instead of crashing the
// whole process at require-time (this file loads even when Google sign-in is unused).
let googleClient;
function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(500, 'El inicio de sesión con Google no está configurado (falta GOOGLE_CLIENT_ID)');
  }
  if (!googleClient) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

const SALT_ROUNDS = 10;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function sanitizeUser(user) {
  const obj = user.toObject();
  delete obj.passwordHash;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
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
    googleCredential,
    identificationType,
    identificationNumber
  } = req.body;

  if (!ownerName || !barbershopName || !slug) {
    throw new ApiError(400, 'ownerName, barbershopName y slug son requeridos');
  }
  if (!identificationType || !identificationNumber) {
    throw new ApiError(400, 'identificationType e identificationNumber son requeridos');
  }
  if (!['CC', 'CE', 'NIT', 'PA'].includes(identificationType)) {
    throw new ApiError(400, 'identificationType debe ser CC, CE, NIT o PA');
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
      throw new ApiError(401, 'El credential de Google es inválido');
    }
    if (!payload?.email || !payload.email_verified) {
      throw new ApiError(401, 'El correo de tu cuenta de Google no está verificado');
    }
    email = payload.email.toLowerCase();
    emailVerified = true;
    // Never used to log in (Google is the only path in from here on) — it only exists
    // because passwordHash is a required field on the User schema.
    passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
  } else {
    if (!rawEmail || !password) {
      throw new ApiError(400, 'email y password son requeridos');
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new ApiError(400, 'password y confirmPassword no coinciden');
    }
    email = rawEmail.toLowerCase();
    passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const normalizedSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');
  if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
    throw new ApiError(400, 'El slug solo puede tener minúsculas, números y guiones');
  }

  const existingEmail = await User.findOne({ email, role: 'owner' });
  if (existingEmail) {
    throw new ApiError(409, 'Ya existe una cuenta de dueño con este correo');
  }
  const existingId = await User.findOne({ identificationNumber });
  if (existingId) {
    throw new ApiError(409, 'Ya existe una cuenta registrada con este número de documento');
  }
  const existingSlug = await Barbershop.findOne({ slug: normalizedSlug });
  if (existingSlug) {
    throw new ApiError(409, 'Este slug ya está en uso');
  }

  const owner = await User.create({
    name: ownerName,
    email,
    passwordHash,
    phone,
    role: 'owner',
    emailVerified,
    identificationType,
    identificationNumber,
    // On by default — the owner can turn it off later from Equipo if they don't
    // personally take appointments.
    attendsClients: true
  });

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
    throw new ApiError(400, 'name, email, password y paymentScheme son requeridos');
  }
  if (!['commission', 'fixed', 'mixed'].includes(paymentScheme)) {
    throw new ApiError(400, 'paymentScheme debe ser commission, fixed o mixed');
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase(), role: 'barber' });
  if (existingEmail) {
    throw new ApiError(409, 'Ya existe un profesional con este correo');
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
  const { name, email: rawEmail, password, phone, googleCredential } = req.body;

  if (!name) {
    throw new ApiError(400, 'name es requerido');
  }

  // Same two paths as registerBarbershop: a password pair, or a verified Google
  // credential (which also vouches for the email, skipping our own verification step).
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
      throw new ApiError(401, 'El credential de Google es inválido');
    }
    if (!payload?.email || !payload.email_verified) {
      throw new ApiError(401, 'El correo de tu cuenta de Google no está verificado');
    }
    email = payload.email.toLowerCase();
    emailVerified = true;
    passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
  } else {
    if (!rawEmail || !password) {
      throw new ApiError(400, 'email y password son requeridos');
    }
    email = rawEmail.toLowerCase();
    passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const existingEmail = await User.findOne({ email, role: 'customer' });
  if (existingEmail) {
    throw new ApiError(409, 'Ya existe un cliente con este correo');
  }

  const customer = await User.create({ name, email, passwordHash, phone, role: 'customer', emailVerified });

  const token = signToken(customer);
  res.status(201).json({ token, user: sanitizeUser(customer) });
});

// Email is only unique per (email, role) now, so the same address can front more than
// one account (e.g. a barber who also has a customer account, or who later opens their
// own shop as an owner). A password only ever matches its own account's hash, so trying
// it against every candidate resolves the ambiguity without any change on the client.
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'email y password son requeridos');
  }

  const candidates = await User.find({ email: email.toLowerCase(), active: true });

  let matched = null;
  for (const candidate of candidates) {
    if (await bcrypt.compare(password, candidate.passwordHash)) {
      matched = candidate;
      break;
    }
  }
  if (!matched) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  const token = signToken(matched);
  res.json({ token, user: sanitizeUser(matched) });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'email es requerido');
  }

  const user = await User.findOne({ email: email.toLowerCase(), active: true });
  // Always answer the same way whether or not the email exists — otherwise this
  // endpoint becomes a way to check which emails are registered in Cortio.
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    await user.save();

    try {
      const appUrl = process.env.APP_URL || '';
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: `${appUrl}/reset-password/${token}`
      });
    } catch (err) {
      console.error('[auth] Failed to send password reset email:', err.message);
    }
  }

  res.json({ sent: true });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token || !password) {
    throw new ApiError(400, 'token y password son requeridos');
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw new ApiError(400, 'password y confirmPassword no coinciden');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'password debe tener al menos 6 caracteres');
  }

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() }
  });
  if (!user) {
    throw new ApiError(400, 'Este link de recuperación es inválido o ya expiró');
  }

  user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const authToken = signToken(user);
  res.json({ token: authToken, user: sanitizeUser(user) });
});

// Google only authenticates an existing account here — it doesn't create one. Letting
// a Google credential silently create a barbershop owner would skip the registration
// wizard (shop name, slug, address) with no way to collect that data mid-flow.
const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    throw new ApiError(400, 'credential es requerido');
  }

  let payload;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw new ApiError(401, 'El credential de Google es inválido');
  }

  if (!payload?.email || !payload.email_verified) {
    throw new ApiError(401, 'El correo de tu cuenta de Google no está verificado');
  }

  const matches = await User.find({ email: payload.email.toLowerCase(), active: true });
  if (matches.length === 0) {
    throw new ApiError(404, 'No existe una cuenta con este correo. Regístrate primero.');
  }
  // Google doesn't give us a password to disambiguate with, unlike the regular login —
  // if this email fronts more than one account (e.g. owner + customer), fall back to
  // asking for a password instead of guessing which one they meant.
  if (matches.length > 1) {
    throw new ApiError(409, 'Tienes varias cuentas con este correo. Inicia sesión con tu contraseña para elegir cuál.');
  }

  const user = matches[0];
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
    if (!name.trim()) throw new ApiError(400, 'name no puede estar vacío');
    updates.name = name.trim();
  }
  if (phone !== undefined) {
    updates.phone = phone;
  }
  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) throw new ApiError(400, 'email no puede estar vacío');
    if (normalizedEmail !== req.user.email) {
      const existing = await User.findOne({ email: normalizedEmail, role: req.user.role });
      if (existing) throw new ApiError(409, 'Este correo ya está en uso');
      // A changed email is unverified until it's confirmed again.
      updates.emailVerified = false;
    }
    updates.email = normalizedEmail;
  }

  // Only the owner has a bookable-as-professional toggle + schedule on their own account
  // — barbers' schedules are managed by the owner via PATCH /api/barbers/:id instead.
  if (req.user.role === 'owner') {
    if (req.body.attendsClients !== undefined) {
      updates.attendsClients = Boolean(req.body.attendsClients);
    }
    if (req.body.schedule !== undefined) {
      updates.schedule = req.body.schedule;
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json(sanitizeUser(user));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw new ApiError(400, 'token es requerido');
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() }
  });
  if (!user) {
    throw new ApiError(400, 'Este link de verificación es inválido o ya expiró');
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json(sanitizeUser(user));
});

const resendVerification = asyncHandler(async (req, res) => {
  if (req.user.emailVerified) {
    throw new ApiError(409, 'Este correo ya está verificado');
  }
  await issueVerificationEmail(req.user);
  res.json({ sent: true });
});

module.exports = {
  registerBarbershop,
  registerBarber,
  registerCustomer,
  login,
  forgotPassword,
  resetPassword,
  googleLogin,
  me,
  updateMe,
  verifyEmail,
  resendVerification
};
