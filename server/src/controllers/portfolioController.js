const fs = require('fs');
const path = require('path');
const PortfolioPhoto = require('../models/PortfolioPhoto');
const Barbershop = require('../models/Barbershop');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No se subió ningún archivo');
  }

  const photo = await PortfolioPhoto.create({
    barbershop: req.user.barbershop,
    barber: req.user._id,
    service: req.body.serviceId || undefined,
    description: req.body.description,
    imageUrl: `/uploads/portfolio/${req.file.filename}`
  });
  await photo.populate('service', 'name');

  res.status(201).json(photo);
});

const listMine = asyncHandler(async (req, res) => {
  const photos = await PortfolioPhoto.find({ barber: req.user._id })
    .sort({ createdAt: -1 })
    .populate('service', 'name');
  res.json(photos);
});

const listByBarber = asyncHandler(async (req, res) => {
  const photos = await PortfolioPhoto.find({
    barbershop: req.user.barbershop,
    barber: req.params.barberId
  })
    .sort({ createdAt: -1 })
    .populate('service', 'name');
  res.json(photos);
});

const listPublic = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findOne({ slug: req.params.slug, active: true });
  if (!barbershop) {
    throw new ApiError(404, 'Establecimiento no encontrado');
  }

  const filter = { barbershop: barbershop._id };
  if (req.query.barberId) filter.barber = req.query.barberId;

  const photos = await PortfolioPhoto.find(filter)
    .sort({ createdAt: -1 })
    .select('barber imageUrl description service')
    .populate('service', 'name');
  res.json(photos);
});

const remove = asyncHandler(async (req, res) => {
  const photo = await PortfolioPhoto.findOne({ _id: req.params.id, barbershop: req.user.barbershop });
  if (!photo) {
    throw new ApiError(404, 'Foto no encontrada');
  }

  const isOwner = req.user.role === 'owner';
  const isPhotoOwner = req.user.role === 'barber' && photo.barber.toString() === req.user._id.toString();
  if (!isOwner && !isPhotoOwner) {
    throw new ApiError(403, 'No tienes permiso para eliminar esta foto');
  }

  const filePath = path.join(__dirname, '..', '..', photo.imageUrl);
  fs.unlink(filePath, () => {});
  await photo.deleteOne();

  res.status(204).send();
});

module.exports = { create, listMine, listByBarber, listPublic, remove };
