const { MercadoPagoConfig, Preference, Payment, WebhookSignatureValidator, InvalidWebhookSignatureError } = require('mercadopago');
const ApiError = require('../utils/ApiError');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new ApiError(500, `Falta la variable de entorno requerida: ${name}`);
  return value;
}

// Lazy singleton, same reasoning as the Google OAuth2 client in authController — a
// missing access token surfaces as a clean 500 from the route instead of crashing the
// whole process at require-time.
let client;
function getClient() {
  if (!client) {
    client = new MercadoPagoConfig({ accessToken: requireEnv('MERCADOPAGO_ACCESS_TOKEN') });
  }
  return client;
}

function wrapMpError(err) {
  const message = err?.message || 'La solicitud a MercadoPago falló';
  return new ApiError(502, `Error de MercadoPago: ${message}`);
}

// A one-time Checkout Pro payment for one billing period — not a recurring mandate.
// MercadoPago's Suscripciones product (POST /preapproval) requires the payer's bank to
// support pre-authorized recurring debits, which most Colombian debit cards don't; this
// app's target customers overwhelmingly carry debit, not credit, so billing is instead
// "pay this month's link" rather than fully automatic. Checkout Pro accepts debit,
// credit, PSE, and cash networks, and — unlike /preapproval — actually works reliably.
// `cycle` rides along inside external_reference (barbershopId, or barbershopId:annual)
// instead of any local "pending checkout" state — stateless and immune to the owner
// starting two checkouts (e.g. monthly then annual) before finishing either one; the
// webhook always applies whatever cycle the actually-paid preference was created with.
async function createPaymentPreference({ barbershopId, cycle, payerEmail, amountCOP, reason, backUrl }) {
  try {
    return await new Preference(getClient()).create({
      body: {
        items: [{ title: reason, quantity: 1, unit_price: amountCOP, currency_id: 'COP' }],
        payer: { email: payerEmail },
        external_reference: cycle === 'annual' ? `${barbershopId}:annual` : barbershopId,
        back_urls: { success: backUrl, pending: backUrl, failure: backUrl }
      }
    });
  } catch (err) {
    throw wrapMpError(err);
  }
}

async function getPayment(paymentId) {
  try {
    return await new Payment(getClient()).get({ id: paymentId });
  } catch (err) {
    throw wrapMpError(err);
  }
}

// Throws InvalidWebhookSignatureError on failure — the controller decides how to
// respond (401), this just answers "was this really sent by MercadoPago?".
function verifyWebhookSignature({ xSignature, xRequestId, dataId, secret }) {
  WebhookSignatureValidator.validate({ xSignature, xRequestId, dataId, secret, toleranceSeconds: 300 });
}

module.exports = {
  createPaymentPreference,
  getPayment,
  verifyWebhookSignature,
  InvalidWebhookSignatureError
};
