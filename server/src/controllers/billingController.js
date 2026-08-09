const Barbershop = require('../models/Barbershop');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isBlocked } = require('../middleware/subscription');
const {
  createPaymentPreference,
  getPayment,
  verifyWebhookSignature,
  InvalidWebhookSignatureError
} = require('../services/mercadopagoService');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Shared by the webhook (and only the webhook now — there's no synchronous "claim" step
// anymore, since a Checkout Pro payment already carries our external_reference from the
// moment we create it). Guards against double-applying the same payment if MercadoPago
// redelivers the notification (its webhook delivery is at-least-once, not exactly-once).
async function applyPaymentResult({ barbershop, payment }) {
  if (payment.status === 'approved') {
    if (barbershop.lastPaymentReference === String(payment.id) && barbershop.subscriptionStatus === 'active') {
      return;
    }
    const now = new Date();
    const base = barbershop.currentPeriodEnd && barbershop.currentPeriodEnd > now ? barbershop.currentPeriodEnd : now;
    const next = new Date(base);
    next.setMonth(next.getMonth() + 1);

    barbershop.subscriptionStatus = 'active';
    barbershop.currentPeriodEnd = next;
    barbershop.mercadopagoCardBrand = payment.payment_method_id || undefined;
    barbershop.lastPaymentReference = String(payment.id);
    barbershop.cancelAtPeriodEnd = false;
    await barbershop.save();
  } else if (payment.status === 'rejected') {
    barbershop.subscriptionStatus = 'past_due';
    barbershop.lastPaymentReference = String(payment.id);
    await barbershop.save();
  }
  // 'pending' / 'in_process' (common for PSE and cash network payments) — leave
  // subscriptionStatus as-is, a later webhook call resolves it once it clears.
}

const getStatus = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop).select(
    'subscriptionStatus trialEndsAt currentPeriodEnd mercadopagoCardBrand deletionRequestedAt scheduledPurgeAt cancelAtPeriodEnd'
  );
  if (!barbershop) {
    throw new ApiError(404, 'Establecimiento no encontrado');
  }

  const now = new Date();
  const blocked = isBlocked(barbershop, now);

  // Lazy transition: nothing crons this, so the first status check after a canceled
  // owner's paid period actually elapses is what formally flips them to 'canceled'
  // instead of leaving 'active'+blocked dangling forever.
  if (barbershop.cancelAtPeriodEnd && blocked && barbershop.subscriptionStatus === 'active') {
    barbershop.subscriptionStatus = 'canceled';
    barbershop.cancelAtPeriodEnd = false;
    await barbershop.save();
  }

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
    cancelAtPeriodEnd: barbershop.cancelAtPeriodEnd,
    priceCOP: Number(process.env.SUBSCRIPTION_PRICE_COP || 0)
  });
});

// Self-service "stop renewing" — there's no recurring mandate to cancel on
// MercadoPago's side (each period is its own Checkout Pro link), so this just records
// the owner's intent. Access continues until currentPeriodEnd, same as if they simply
// hadn't paid again; getStatus above flips the formal status once that date passes.
const cancelSubscription = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Establecimiento no encontrado');
  }
  if (barbershop.subscriptionStatus !== 'active') {
    throw new ApiError(400, 'No tienes una suscripción activa para cancelar');
  }

  barbershop.cancelAtPeriodEnd = true;
  await barbershop.save();

  res.json({ cancelAtPeriodEnd: true });
});

const resumeSubscription = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Establecimiento no encontrado');
  }

  barbershop.cancelAtPeriodEnd = false;
  await barbershop.save();

  res.json({ cancelAtPeriodEnd: false });
});

// Generates a fresh Checkout Pro payment link for this billing period — the owner pays
// it on MercadoPago's own hosted page (debit, credit, PSE, or cash network), then the
// webhook below extends currentPeriodEnd once it clears.
const startCheckout = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Establecimiento no encontrado');
  }

  const priceCOP = Number(process.env.SUBSCRIPTION_PRICE_COP);
  if (!priceCOP) {
    throw new ApiError(500, 'SUBSCRIPTION_PRICE_COP no está configurado en el servidor');
  }

  const preference = await createPaymentPreference({
    barbershopId: String(barbershop._id),
    payerEmail: req.user.email,
    amountCOP: priceCOP,
    reason: `Cortio Software — Suscripción mensual (${barbershop.name})`,
    backUrl: `${process.env.APP_URL}/app/billing`
  });

  res.json({ checkoutUrl: preference.init_point });
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

  if (topic === 'payment' && dataId) {
    const payment = await getPayment(dataId);
    if (payment.external_reference) {
      const barbershop = await Barbershop.findById(payment.external_reference);
      if (barbershop) {
        await applyPaymentResult({ barbershop, payment });
      }
    }
  }

  res.status(200).json({ received: true });
});

module.exports = { getStatus, startCheckout, cancelSubscription, resumeSubscription, handleWebhook, applyPaymentResult };
