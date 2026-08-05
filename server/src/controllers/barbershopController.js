const fs = require('fs');
const path = require('path');
const Barbershop = require('../models/Barbershop');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const getBySlug = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findOne({ slug: req.params.slug, active: true });
  if (!barbershop) {
    throw new ApiError(404, 'Barbershop not found');
  }
  res.json(barbershop);
});

const getMe = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Barbershop not found');
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
    throw new ApiError(404, 'Barbershop not found');
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
    throw new ApiError(404, 'Barbershop not found');
  }

  const now = new Date();
  const scheduledPurgeAt = new Date(now);
  scheduledPurgeAt.setDate(scheduledPurgeAt.getDate() + DELETION_GRACE_DAYS);

  barbershop.deletionRequestedAt = now;
  barbershop.scheduledPurgeAt = scheduledPurgeAt;
  // Stops the billing cron from charging this shop again and blocks panel access via
  // the same requireActiveSubscription check any other canceled account hits.
  barbershop.subscriptionStatus = 'canceled';
  await barbershop.save();

  res.json(barbershop);
});

const cancelDeletion = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findById(req.user.barbershop);
  if (!barbershop) {
    throw new ApiError(404, 'Barbershop not found');
  }
  if (!barbershop.deletionRequestedAt) {
    throw new ApiError(409, 'No deletion is pending for this barbershop');
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
    throw new ApiError(404, 'Barbershop not found');
  }
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
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
