const Barbershop = require('../models/Barbershop');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const BLOCKED_STATUSES = ['past_due', 'canceled'];

// Computed live from dates rather than trusting subscriptionStatus alone, so there's
// no lag between a trial/period actually expiring and the daily billing job catching up.
function isBlocked(barbershop, now) {
  if (BLOCKED_STATUSES.includes(barbershop.subscriptionStatus)) return true;
  if (barbershop.subscriptionStatus === 'trialing') {
    return Boolean(barbershop.trialEndsAt) && now > barbershop.trialEndsAt;
  }
  if (barbershop.subscriptionStatus === 'active') {
    return Boolean(barbershop.currentPeriodEnd) && now > barbershop.currentPeriodEnd;
  }
  return false;
}

const requireActiveSubscription = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role === 'customer') return next();

  const barbershop = await Barbershop.findById(req.user.barbershop).select(
    'subscriptionStatus trialEndsAt currentPeriodEnd'
  );
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }

  if (isBlocked(barbershop, new Date())) {
    throw new ApiError(402, 'Tu suscripción no está activa. Actualiza tu método de pago para continuar.');
  }

  next();
});

module.exports = { requireActiveSubscription, isBlocked };
