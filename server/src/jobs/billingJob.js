const Barbershop = require('../models/Barbershop');
const { getAcceptanceTokens, chargePaymentSource } = require('../services/wompiService');
const { applyTransactionResult, buildReference } = require('../controllers/billingController');

// Runs daily: renews every barbershop whose paid period has ended by charging their
// saved Wompi payment source. Barbershops still on trial need no action here — access
// is blocked live (see middleware/subscription.js) the moment their trial date passes.
async function runBillingJob() {
  const priceCOP = Number(process.env.SUBSCRIPTION_PRICE_COP);
  if (!priceCOP) {
    console.error('[billingJob] SUBSCRIPTION_PRICE_COP is not configured, skipping run');
    return;
  }

  const now = new Date();
  const due = await Barbershop.find({
    subscriptionStatus: 'active',
    currentPeriodEnd: { $lte: now },
    wompiPaymentSourceId: { $exists: true, $ne: null }
  }).populate('owner', 'email');

  if (due.length === 0) return;

  const { acceptanceToken } = await getAcceptanceTokens();

  for (const barbershop of due) {
    const reference = buildReference(barbershop._id);
    try {
      const transaction = await chargePaymentSource({
        paymentSourceId: barbershop.wompiPaymentSourceId,
        customerEmail: barbershop.owner.email,
        amountInCents: priceCOP * 100,
        reference,
        acceptanceToken
      });
      await applyTransactionResult({ barbershopId: barbershop._id, transaction });
    } catch (err) {
      console.error(`[billingJob] Charge failed for barbershop ${barbershop._id}:`, err.message);
      barbershop.subscriptionStatus = 'past_due';
      await barbershop.save();
    }
  }
}

module.exports = { runBillingJob };
