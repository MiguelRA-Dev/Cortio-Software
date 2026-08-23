const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Barbershop = require('../models/Barbershop');
const Review = require('../models/Review');
const PortfolioPhoto = require('../models/PortfolioPhoto');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const PUBLIC_FIELDS = 'name avatarUrl schedule services';

const listMyTeam = asyncHandler(async (req, res) => {
  // Barbers only get enough to populate a "who attended" picker (e.g. in POS) —
  // never a colleague's pay scheme, commission rate, phone, etc. `services` is harmless
  // to share (not sensitive), so a barber can still see who covers what.
  const fields = req.user.role === 'owner' ? '-passwordHash' : 'name avatarUrl active services';
  const barbers = await User.find({ barbershop: req.user.barbershop, role: 'barber' }).select(fields);
  res.json(barbers);
});

const listPublicBarbers = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findOne({ slug: req.params.slug, active: true });
  if (!barbershop) {
    throw new ApiError(404, 'Establecimiento no encontrado');
  }
  const barbers = await User.find({ barbershop: barbershop._id, role: 'barber', active: true }).select(PUBLIC_FIELDS);

  // The owner shows up here too when they've opted in to take appointments themselves —
  // same account, no separate barber login (see User.attendsClients).
  const owner = await User.findOne({
    _id: barbershop.owner,
    attendsClients: true,
    active: true
  }).select(PUBLIC_FIELDS);
  if (owner) barbers.push(owner);

  const [ratings, portfolioCounts] = await Promise.all([
    Review.aggregate([
      { $match: { barbershop: barbershop._id } },
      { $group: { _id: '$barber', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]),
    PortfolioPhoto.aggregate([
      { $match: { barbershop: barbershop._id } },
      { $group: { _id: '$barber', count: { $sum: 1 } } }
    ])
  ]);

  const ratingByBarber = new Map(ratings.map((r) => [r._id.toString(), r]));
  const portfolioByBarber = new Map(portfolioCounts.map((p) => [p._id.toString(), p.count]));

  const enriched = barbers.map((b) => {
    const obj = b.toObject();
    const rating = ratingByBarber.get(b._id.toString());
    obj.rating = rating ? Math.round(rating.avgRating * 10) / 10 : null;
    obj.reviewsCount = rating ? rating.count : 0;
    obj.portfolioCount = portfolioByBarber.get(b._id.toString()) || 0;
    return obj;
  });

  res.json(enriched);
});

const ALLOWED_UPDATE_FIELDS = ['name', 'phone', 'avatarUrl', 'paymentScheme', 'commissionRate', 'baseSalary', 'schedule', 'scheduleExceptions', 'active', 'services', 'whatsappNotificationsEnabled'];

const updateBarber = asyncHandler(async (req, res) => {
  const barber = await User.findOne({ _id: req.params.id, barbershop: req.user.barbershop, role: 'barber' });
  if (!barber) {
    throw new ApiError(404, 'Profesional no encontrado');
  }

  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      barber[field] = req.body[field];
    }
  }
  await barber.save();

  const obj = barber.toObject();
  delete obj.passwordHash;
  res.json(obj);
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (req.user.role === 'barber' && req.params.id !== req.user._id.toString()) {
    throw new ApiError(403, 'Solo puedes subir tu propia foto');
  }

  const barber = await User.findOne({
    _id: req.params.id,
    barbershop: req.user.barbershop,
    $or: [{ role: 'barber' }, { role: 'owner', attendsClients: true }]
  });
  if (!barber) {
    throw new ApiError(404, 'Profesional no encontrado');
  }
  if (!req.file) {
    throw new ApiError(400, 'No se subió ningún archivo');
  }

  if (barber.avatarUrl && barber.avatarUrl.startsWith('/uploads/avatars/')) {
    const oldPath = path.join(__dirname, '..', '..', barber.avatarUrl);
    fs.unlink(oldPath, () => {});
  }

  barber.avatarUrl = `/uploads/avatars/${req.file.filename}`;
  await barber.save();

  const obj = barber.toObject();
  delete obj.passwordHash;
  res.json(obj);
});

module.exports = { listMyTeam, listPublicBarbers, updateBarber, uploadAvatar };
