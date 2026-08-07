const fs = require('fs');
const path = require('path');
const Barbershop = require('../models/Barbershop');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { cancelSubscription } = require('../services/mercadopagoService');

const getBySlug = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findOne({ slug: req.params.slug, active: true });
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }
  res.json(barbershop);
});

const getMe = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }
  res.json(barbershop);
});

const ALLOWED_UPDATE_FIELDS = ['name', 'location', 'address', 'addressDetails', 'phone', 'logoUrl', 'businessHours'];

const updateMe = asyncHandler(async (req, res) => {
  const updates = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const barbershop = await Barbershop.findByIdAndUpdate(req.user.barbershop, updates, {
    new: true,
    runValidators: true
  });
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }
  res.json(barbershop);
});

const DELETION_GRACE_DAYS = 15;

// What subscriptionStatus reverts to when a deletion is canceled — the account's
// actual paid/trial position never stopped existing, it was just overridden to
// 'canceled' to stop billing and block access while the deletion was pending.
function restoreSubscriptionStatus(barbershop, now) {
  if (barbershop.currentPeriodEnd && barbershop.currentPeriodEnd > now) return 'active';
  if (barbershop.trialEndsAt && barbershop.trialEndsAt > now) return 'trialing';
  return 'past_due';
}

const requestDeletion = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }

  const now = new Date();
  const scheduledPurgeAt = new Date(now);
  scheduledPurgeAt.setDate(scheduledPurgeAt.getDate() + DELETION_GRACE_DAYS);

  barbershop.deletionRequestedAt = now;
  barbershop.scheduledPurgeAt = scheduledPurgeAt;
  // Blocks panel access via the same requireActiveSubscription check any other canceled
  // account hits. MercadoPago's recurring charges run on its own schedule regardless of
  // this field, so the subscription itself is cancelled explicitly right below — without
  // that, the card keeps getting charged monthly with no local trace of it to stop later.
  barbershop.subscriptionStatus = 'canceled';

  if (barbershop.mercadopagoPreapprovalId) {
    // Best-effort: a flaky MercadoPago API call shouldn't block the deletion request
    // itself, but it should be visible in logs since it means we're still on the hook
    // for stopping a real recurring charge by some other means.
    await cancelSubscription(barbershop.mercadopagoPreapprovalId).catch((err) =>
      console.error(`[barbershop] Failed to cancel MercadoPago subscription for ${barbershop._id}:`, err.message)
    );
  }

  await barbershop.save();

  res.json(barbershop);
});

const cancelDeletion = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }
  if (!barbershop.deletionRequestedAt) {
    throw new ApiError(409, 'No hay ninguna eliminación pendiente para esta barbería');
  }

  const now = new Date();
  barbershop.deletionRequestedAt = undefined;
  barbershop.scheduledPurgeAt = undefined;
  barbershop.subscriptionStatus = restoreSubscriptionStatus(barbershop, now);
  await barbershop.save();

  res.json(barbershop);
});

const uploadLogo = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }
  if (!req.file) {
    throw new ApiError(400, 'No se subió ningún archivo');
  }

  if (barbershop.logoUrl && barbershop.logoUrl.startsWith('/uploads/logos/')) {
    const oldPath = path.join(__dirname, '..', '..', barbershop.logoUrl);
    fs.unlink(oldPath, () => {});
  }

  barbershop.logoUrl = `/uploads/logos/${req.file.filename}`;
  await barbershop.save();
  res.json(barbershop);
});

module.exports = { getBySlug, getMe, updateMe, uploadLogo, requestDeletion, cancelDeletion };
