const { MercadoPagoConfig, PreApproval, Invoice, WebhookSignatureValidator, InvalidWebhookSignatureError } = require('mercadopago');
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

// The hosted-checkout URL for the app's single subscription plan (see MERCADOPAGO_PLAN_ID
// in .env.example) — the payer enters their card directly on MercadoPago's own page.
// Creating individual subscriptions via POST /preapproval currently 500s on MercadoPago's
// side regardless of payload (confirmed against both a real and a sandbox test account),
// so this app deliberately never calls that endpoint — only the plan-based checkout link,
// which uses a different, working code path on their end.
function getPlanCheckoutUrl() {
  const planId = requireEnv('MERCADOPAGO_PLAN_ID');
  return `https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=${planId}`;
}

// Finds the subscription the payer just created by paying through the plan checkout
// link. There's no way to tag it as "this barbershop's" before they pay (see above), so
// this looks for the newest authorized-but-unclaimed (no external_reference yet)
// subscription on our plan created after the caller started checkout.
async function findUnclaimedSubscription({ sinceDate }) {
  const planId = requireEnv('MERCADOPAGO_PLAN_ID');
  try {
    const result = await new PreApproval(getClient()).search({ options: { preapproval_plan_id: planId } });
    const candidates = (result.results || []).filter(
      (sub) => sub.status === 'authorized' && !sub.external_reference && new Date(sub.date_created) >= sinceDate
    );
    candidates.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
    return candidates[0];
  } catch (err) {
    throw wrapMpError(err);
  }
}

// Tags an existing subscription with our own barbershop id — the only write PreApproval
// actually accepts reliably (creation via POST is what's broken; PUT works fine).
async function claimSubscription({ preapprovalId, externalReference }) {
  try {
    return await new PreApproval(getClient()).update({ id: preapprovalId, body: { external_reference: externalReference } });
  } catch (err) {
    throw wrapMpError(err);
  }
}

async function getSubscription(preapprovalId) {
  try {
    return await new PreApproval(getClient()).get({ id: preapprovalId });
  } catch (err) {
    throw wrapMpError(err);
  }
}

// A subscription's "invoice" is one individual recurring charge attempt — this is what
// the subscription_authorized_payment webhook's data.id points to.
async function getInvoice(invoiceId) {
  try {
    return await new Invoice(getClient()).get({ id: invoiceId });
  } catch (err) {
    throw wrapMpError(err);
  }
}

async function cancelSubscription(preapprovalId) {
  try {
    return await new PreApproval(getClient()).update({ id: preapprovalId, body: { status: 'cancelled' } });
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
  getPlanCheckoutUrl,
  findUnclaimedSubscription,
  claimSubscription,
  getSubscription,
  getInvoice,
  cancelSubscription,
  verifyWebhookSignature,
  InvalidWebhookSignatureError
};
