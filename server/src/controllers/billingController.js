const Barbershop = require('../models/Barbershop');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isBlocked } = require('../middleware/subscription');
const { getAcceptanceTokens, createPaymentSource, chargePaymentSource, verifyEventSignature } = require('../services/wompiService');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function buildReference(barbershopId) {
  return `cortio-sub-${barbershopId}-${Date.now()}`;
}

function parseBarbershopIdFromReference(reference) {
  const match = /^cortio-sub-([a-f0-9]{24})-/.exec(reference || '');
  return match ? match[1] : null;
}

// Shared by the synchronous charge response and the async webhook, so both paths
// update subscription state the same way and don't double-apply the same charge.
async function applyTransactionResult({ barbershopId, transaction }) {
  const barbershop = await Barbershop.findById(barbershopId);
  if (!barbershop) return;

  if (transaction.status === 'APPROVED') {
    if (barbershop.lastPaymentReference === transaction.reference && barbershop.subscriptionStatus === 'active') {
      return;
    }
    const now = new Date();
    const base = barbershop.currentPeriodEnd && barbershop.currentPeriodEnd > now ? barbershop.currentPeriodEnd : now;
    const next = new Date(base);
    next.setMonth(next.getMonth() + 1);

    barbershop.subscriptionStatus = 'active';
    barbershop.currentPeriodEnd = next;
    barbershop.lastPaymentReference = transaction.reference;
    await barbershop.save();
  } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(transaction.status)) {
    barbershop.subscriptionStatus = 'past_due';
    barbershop.lastPaymentReference = transaction.reference;
    await barbershop.save();
  }
}

const getStatus = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop).select(
    'subscriptionStatus trialEndsAt currentPeriodEnd wompiCardLastFour wompiCardBrand deletionRequestedAt scheduledPurgeAt'
  );
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }

  const now = new Date();
  const trialDaysLeft =
    barbershop.subscriptionStatus === 'trialing' && barbershop.trialEndsAt
      ? Math.max(0, Math.ceil((barbershop.trialEndsAt - now) / ONE_DAY_MS))
      : null;

  res.json({
    subscriptionStatus: barbershop.subscriptionStatus,
    trialEndsAt: barbershop.trialEndsAt,
    currentPeriodEnd: barbershop.currentPeriodEnd,
    trialDaysLeft,
    blocked: isBlocked(barbershop, now),
    deletionRequestedAt: barbershop.deletionRequestedAt,
    scheduledPurgeAt: barbershop.scheduledPurgeAt,
    card: barbershop.wompiCardLastFour
      ? { lastFour: barbershop.wompiCardLastFour, brand: barbershop.wompiCardBrand }
      : null,
    priceCOP: Number(process.env.SUBSCRIPTION_PRICE_COP || 0)
  });
});

const attachPaymentMethod = asyncHandler(async (req, res) => {
  const { cardToken } = req.body;
  if (!cardToken) {
    throw new ApiError(400, 'cardToken es requerido');
  }

  const priceCOP = Number(process.env.SUBSCRIPTION_PRICE_COP);
  if (!priceCOP) {
    throw new ApiError(500, 'SUBSCRIPTION_PRICE_COP no está configurado en el servidor');
  }

  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }

  const { acceptanceToken, personalAuthToken } = await getAcceptanceTokens();

  const paymentSource = await createPaymentSource({
    cardToken,
    customerEmail: req.user.email,
    acceptanceToken,
    personalAuthToken
  });

  const reference = buildReference(barbershop._id);
  const transaction = await chargePaymentSource({
    paymentSourceId: paymentSource.id,
    customerEmail: req.user.email,
    amountInCents: priceCOP * 100,
    reference,
    acceptanceToken
  });

  barbershop.wompiPaymentSourceId = String(paymentSource.id);
  barbershop.wompiCardLastFour = paymentSource.public_data?.last_four;
  barbershop.wompiCardBrand = paymentSource.public_data?.brand;
  await barbershop.save();

  await applyTransactionResult({ barbershopId: barbershop._id, transaction });

  const refreshed = await Barbershop.findById(barbershop._id).select('subscriptionStatus currentPeriodEnd');
  res.json({
    subscriptionStatus: refreshed.subscriptionStatus,
    currentPeriodEnd: refreshed.currentPeriodEnd,
    transactionStatus: transaction.status
  });
});

const handleWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  const valid = secret && verifyEventSignature(req.body, secret);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  if (event.event === 'transaction.updated' && event.data?.transaction) {
    const transaction = event.data.transaction;
    const barbershopId = parseBarbershopIdFromReference(transaction.reference);
    if (barbershopId) {
      await applyTransactionResult({ barbershopId, transaction });
    }
  }

  res.status(200).json({ received: true });
});

module.exports = { getStatus, attachPaymentMethod, handleWebhook, applyTransactionResult, buildReference };
