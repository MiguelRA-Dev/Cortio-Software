const rateLimit = require('express-rate-limit');

// Guards login, registration, password reset and email-resend endpoints — the ones
// someone could abuse to brute-force a password or flood an inbox with emails.
// 10 requests / 15 min per IP is generous for a real user (typos, retries) but far
// too slow to be useful for guessing a password or spamming a stranger's inbox.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' },
  // Vitest sets NODE_ENV=test automatically — the integration suite makes far more than
  // 10 auth requests per file against a shared in-memory store, which has nothing to do
  // with what those tests are actually checking.
  skip: () => process.env.NODE_ENV === 'test'
});

module.exports = { authLimiter };
