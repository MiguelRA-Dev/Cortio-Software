const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Barbershop = require('../models/Barbershop');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const PUBLIC_FIELDS = 'name avatarUrl schedule';

const listMyTeam = asyncHandler(async (req, res) => {
  // Barbers only get enough to populate a "who attended" picker (e.g. in POS) —
  // never a colleague's pay scheme, commission rate, phone, etc.
  const fields = req.user.role === 'owner' ? '-passwordHash' : 'name avatarUrl active';
  const barbers = await User.find({ barbershop: req.user.barbershop, role: 'barber' }).select(fields);
  res.json(barbers);
});

const listPublicBarbers = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findOne({ slug: req.params.slug, active: true });
  if (!barbershop) {
    throw new ApiError(404, 'Barbershop not found');
  }
  const barbers = await User.find({ barbershop: barbershop._id, role: 'barber', active: true }).select(PUBLIC_FIELDS);
  res.json(barbers);
});

const ALLOWED_UPDATE_FIELDS = ['name', 'phone', 'avatarUrl', 'paymentScheme', 'commissionRate', 'baseSalary', 'schedule', 'scheduleExceptions', 'active'];

const updateBarber = asyncHandler(async (req, res) => {
  const barber = await User.findOne({ _id: req.params.id, barbershop: req.user.barbershop, role: 'barber' });
  if (!barber) {
    throw new ApiError(404, 'Barber not found');
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
  const barber = await User.findOne({ _id: req.params.id, barbershop: req.user.barbershop, role: 'barber' });
  if (!barber) {
    throw new ApiError(404, 'Barber not found');
  }
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
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
