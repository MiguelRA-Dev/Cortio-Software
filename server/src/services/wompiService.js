const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const BASE_URL = process.env.WOMPI_ENV === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new ApiError(500, `Missing required env var: ${name}`);
  return value;
}

async function wompiFetch(path, { method = 'GET', body, useSecretKey = false } = {}) {
  const key = useSecretKey ? requireEnv('WOMPI_PRIVATE_KEY') : requireEnv('WOMPI_PUBLIC_KEY');

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error?.reason || json?.error?.messages || `Wompi request failed (${res.status})`;
    throw new ApiError(502, `Wompi error: ${JSON.stringify(message)}`);
  }
  return json;
}

// Wompi requires proof of acceptance of its terms/personal-data policies before
// tokenizing a payment method — these tokens come from the merchant's own public profile.
async function getAcceptanceTokens() {
  const publicKey = requireEnv('WOMPI_PUBLIC_KEY');
  const json = await wompiFetch(`/merchants/${publicKey}`);
  return {
    acceptanceToken: json.data.presigned_acceptance.acceptance_token,
    personalAuthToken: json.data.presigned_personal_data_auth?.acceptance_token
  };
}

async function createPaymentSource({ cardToken, customerEmail, acceptanceToken, personalAuthToken }) {
  const json = await wompiFetch('/payment_sources', {
    method: 'POST',
    useSecretKey: true,
    body: {
      type: 'CARD',
      token: cardToken,
      customer_email: customerEmail,
      acceptance_token: acceptanceToken,
      accept_personal_auth: personalAuthToken
    }
  });
  return json.data;
}

async function chargePaymentSource({ paymentSourceId, customerEmail, amountInCents, reference, acceptanceToken }) {
  const json = await wompiFetch('/transactions', {
    method: 'POST',
    useSecretKey: true,
    body: {
      amount_in_cents: amountInCents,
      currency: 'COP',
      customer_email: customerEmail,
      payment_source_id: paymentSourceId,
      reference,
      acceptance_token: acceptanceToken
    }
  });
  return json.data;
}

// Webhook payloads carry a checksum built from specific transaction fields + a
// timestamp + the merchant's events secret, hashed with SHA256 (per Wompi's docs).
function verifyEventSignature(event, eventsSecret) {
  const { signature, data } = event || {};
  if (!signature || !data) return false;

  const concatenatedValues = signature.properties
    .map((path) => path.split('.').reduce((obj, key) => obj?.[key], data))
    .join('');

  const toHash = `${concatenatedValues}${signature.timestamp}${eventsSecret}`;
  const calculated = crypto.createHash('sha256').update(toHash).digest('hex').toUpperCase();

  return calculated === signature.checksum;
}

module.exports = { getAcceptanceTokens, createPaymentSource, chargePaymentSource, verifyEventSignature };
