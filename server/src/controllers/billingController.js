const Barbershop = require('../models/Barbershop');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isBlocked } = require('../middleware/subscription');
const {
  getPlanCheckoutUrl,
  findUnclaimedSubscription,
  claimSubscription: tagSubscriptionExternalReference,
  getInvoice,
  verifyWebhookSignature,
  InvalidWebhookSignatureError
} = require('../services/mercadopagoService');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Shared by the claim step and the webhook, so both paths update subscription state the
// same way and don't double-apply the same charge (MercadoPago's webhook delivery is
// at-least-once, not exactly-once).
async function applyInvoiceResult({ barbershop, invoice }) {
  const paymentStatus = invoice.payment?.status;

  if (paymentStatus === 'approved') {
    if (barbershop.lastPaymentReference === invoice.id && barbershop.subscriptionStatus === 'active') {
      return;
    }
    const now = new Date();
    const base = barbershop.currentPeriodEnd && barbershop.currentPeriodEnd > now ? barbershop.currentPeriodEnd : now;
    const next = new Date(base);
    next.setMonth(next.getMonth() + 1);

    barbershop.subscriptionStatus = 'active';
    barbershop.currentPeriodEnd = next;
    barbershop.lastPaymentReference = invoice.id;
    await barbershop.save();
  } else if (paymentStatus === 'rejected') {
    barbershop.subscriptionStatus = 'past_due';
    barbershop.lastPaymentReference = invoice.id;
    await barbershop.save();
  }
  // 'pending' / 'in_process' — leave subscriptionStatus as-is, a later webhook call
  // will resolve it once MercadoPago finishes processing.
}

const getStatus = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop).select(
    'subscriptionStatus trialEndsAt currentPeriodEnd mercadopagoCardBrand mercadopagoCheckoutStartedAt deletionRequestedAt scheduledPurgeAt'
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
    cardBrand: barbershop.mercadopagoCardBrand || null,
    checkoutPending: Boolean(barbershop.mercadopagoCheckoutStartedAt),
    priceCOP: Number(process.env.SUBSCRIPTION_PRICE_COP || 0)
  });
});

// Step 1: hand the owner the link to MercadoPago's hosted checkout for the app's one
// subscription plan, and mark when we sent them there (see claimSubscription below).
const startCheckout = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }

  barbershop.mercadopagoCheckoutStartedAt = new Date();
  await barbershop.save();

  res.json({ checkoutUrl: getPlanCheckoutUrl() });
});

// Step 2: called when the owner lands back on /app/billing after paying. Finds the
// subscription they just authorized (see mercadopagoService.findUnclaimedSubscription for
// why this has to search instead of just knowing the id), tags it as theirs, and reflects
// the just-completed charge immediately instead of waiting on the webhook.
const claimSubscription = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }
  if (!barbershop.mercadopagoCheckoutStartedAt) {
    throw new ApiError(400, 'No hay un pago en curso para confirmar');
  }

  const found = await findUnclaimedSubscription({ sinceDate: barbershop.mercadopagoCheckoutStartedAt });
  if (!found) {
    throw new ApiError(404, 'Todavía no encontramos tu pago. Espera unos segundos e intenta de nuevo.');
  }

  await tagSubscriptionExternalReference({ preapprovalId: found.id, externalReference: String(barbershop._id) });

  barbershop.mercadopagoPreapprovalId = found.id;
  barbershop.mercadopagoCardBrand = found.payment_method_id || undefined;
  barbershop.mercadopagoCheckoutStartedAt = undefined;

  // findUnclaimedSubscription only ever matches status "authorized", which means
  // MercadoPago already accepted the card — good enough to unblock access immediately.
  // summarized.charged_quantity isn't used here because it can lag a few seconds behind
  // authorization; the subscription_authorized_payment webhook is what corrects this
  // later if the actual charge turns out to have failed.
  const now = new Date();
  const next = new Date(now);
  next.setMonth(next.getMonth() + 1);
  barbershop.subscriptionStatus = 'active';
  barbershop.currentPeriodEnd = next;
  await barbershop.save();

  res.json({ subscriptionStatus: barbershop.subscriptionStatus, currentPeriodEnd: barbershop.currentPeriodEnd });
});

const handleWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(401).json({ error: 'Webhook not configured' });
  }

  const dataId = req.query['data.id'] || req.body?.data?.id;
  try {
    verifyWebhookSignature({
      xSignature: req.headers['x-signature'],
      xRequestId: req.headers['x-request-id'],
      dataId,
      secret
    });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    throw err;
  }

  const topic = req.body?.type || req.query.type;

  if (topic === 'subscription_authorized_payment' && dataId) {
    const invoice = await getInvoice(dataId);
    if (invoice.preapproval_id) {
      const barbershop = await Barbershop.findOne({ mercadopagoPreapprovalId: invoice.preapproval_id });
      if (barbershop) {
        await applyInvoiceResult({ barbershop, invoice });
      }
    }
  }

  res.status(200).json({ received: true });
});

module.exports = { getStatus, startCheckout, claimSubscription, handleWebhook, applyInvoiceResult };
