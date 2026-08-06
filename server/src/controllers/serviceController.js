const Service = require('../models/Service');
const Barbershop = require('../models/Barbershop');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const { name, description, durationMinutes, price, category } = req.body;
  if (!name || !durationMinutes || price === undefined) {
    throw new ApiError(400, 'name, durationMinutes y price son requeridos');
  }

  const service = await Service.create({
    barbershop: req.user.barbershop,
    name,
    description,
    durationMinutes,
    price,
    category
  });
  res.status(201).json(service);
});

const listMine = asyncHandler(async (req, res) => {
  const services = await Service.find({ barbershop: req.user.barbershop });
  res.json(services);
});

const listPublic = asyncHandler(async (req, res) => {
  const barbershop = await Barbershop.findOne({ slug: req.params.slug, active: true });
  if (!barbershop) {
    throw new ApiError(404, 'Barbería no encontrada');
  }
  const services = await Service.find({ barbershop: barbershop._id, active: true });
  res.json(services);
});

const ALLOWED_UPDATE_FIELDS = ['name', 'description', 'durationMinutes', 'price', 'category', 'active'];

const update = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, barbershop: req.user.barbershop });
  if (!service) {
    throw new ApiError(404, 'Servicio no encontrado');
  }

  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      service[field] = req.body[field];
    }
  }
  await service.save();
  res.json(service);
});

const remove = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, barbershop: req.user.barbershop });
  if (!service) {
    throw new ApiError(404, 'Servicio no encontrado');
  }
  service.active = false;
  await service.save();
  res.json({ success: true });
});

module.exports = { create, listMine, listPublic, update, remove };
