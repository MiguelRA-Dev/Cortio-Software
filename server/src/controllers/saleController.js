const Sale = require('../models/Sale');
const Service = require('../models/Service');
const Product = require('../models/Product');
const Appointment = require('../models/Appointment');
const InventoryMovement = require('../models/InventoryMovement');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'other'];

const create = asyncHandler(async (req, res) => {
  const { barberId, customerId, appointmentId, items, paymentMethod } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'items must be a non-empty array');
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(400, `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
  }

  let linkedAppointment = null;
  if (appointmentId) {
    linkedAppointment = await Appointment.findOne({ _id: appointmentId, barbershop: req.user.barbershop });
    if (!linkedAppointment) throw new ApiError(404, 'Appointment not found');
    if (req.user.role === 'barber' && linkedAppointment.barber.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only link your own appointments');
    }
    const existingSale = await Sale.findOne({ appointment: linkedAppointment._id });
    if (existingSale) {
      throw new ApiError(409, 'This appointment has already been sold');
    }
  }

  const resolvedItems = [];
  const stockUpdates = [];

  for (const rawItem of items) {
    const { itemType, itemId, quantity } = rawItem;
    if (!['Service', 'Product'].includes(itemType)) {
      throw new ApiError(400, "itemType must be 'Service' or 'Product'");
    }
    if (!quantity || quantity < 1) {
      throw new ApiError(400, 'quantity must be a positive number for every item');
    }

    if (itemType === 'Service') {
      const service = await Service.findOne({ _id: itemId, barbershop: req.user.barbershop, active: true });
      if (!service) throw new ApiError(404, `Service not found: ${itemId}`);

      resolvedItems.push({
        itemType,
        item: service._id,
        name: service.name,
        quantity,
        unitPrice: service.price,
        subtotal: service.price * quantity
      });
    } else {
      const product = await Product.findOne({ _id: itemId, barbershop: req.user.barbershop, active: true });
      if (!product) throw new ApiError(404, `Product not found: ${itemId}`);
      if (product.stockQuantity < quantity) {
        throw new ApiError(409, `Insufficient stock for ${product.name}: only ${product.stockQuantity} available`);
      }

      resolvedItems.push({
        itemType,
        item: product._id,
        name: product.name,
        quantity,
        unitPrice: product.salePrice,
        subtotal: product.salePrice * quantity
      });
      stockUpdates.push({ product, quantity });
    }
  }

  const total = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0);

  for (const { product, quantity } of stockUpdates) {
    product.stockQuantity -= quantity;
    await product.save();
    await InventoryMovement.create({
      barbershop: req.user.barbershop,
      product: product._id,
      type: 'out',
      quantity,
      reason: 'sale',
      createdBy: req.user._id
    });
  }

  // Barbers can only ring up sales under their own name, never attribute revenue to a colleague.
  const barber = req.user.role === 'barber' ? req.user._id : barberId || linkedAppointment?.barber || undefined;

  const sale = await Sale.create({
    barbershop: req.user.barbershop,
    barber,
    customer: customerId || linkedAppointment?.customer || undefined,
    appointment: linkedAppointment?._id,
    source: linkedAppointment ? 'appointment' : 'walk_in',
    items: resolvedItems,
    total,
    paymentMethod,
    createdBy: req.user._id
  });

  // Selling the service is what actually completes the appointment — not a manual status click.
  if (linkedAppointment) {
    linkedAppointment.status = 'completed';
    await linkedAppointment.save();
  }

  res.status(201).json(sale);
});

const list = asyncHandler(async (req, res) => {
  const filter = { barbershop: req.user.barbershop };
  // Barbers only see sales they personally rang up — not the whole shop's.
  if (req.user.role === 'barber') {
    filter.createdBy = req.user._id;
  }
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const sales = await Sale.find(filter)
    .sort({ createdAt: -1 })
    .populate('barber', 'name')
    .populate({ path: 'appointment', select: 'customer startTime', populate: { path: 'customer', select: 'name' } });
  res.json(sales);
});

const getById = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, barbershop: req.user.barbershop };
  if (req.user.role === 'barber') {
    filter.createdBy = req.user._id;
  }

  const sale = await Sale.findOne(filter)
    .populate('barber', 'name')
    .populate({ path: 'appointment', select: 'customer startTime', populate: { path: 'customer', select: 'name' } });
  if (!sale) {
    throw new ApiError(404, 'Sale not found');
  }
  res.json(sale);
});

module.exports = { create, list, getById };
