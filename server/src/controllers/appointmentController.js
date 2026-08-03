const Appointment = require('../models/Appointment');
const Barbershop = require('../models/Barbershop');
const Service = require('../models/Service');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getAvailableSlots } = require('../services/availabilityService');
const parseDateOnly = require('../utils/parseDateOnly');

const ACTIVE_STATUSES = ['pending', 'confirmed'];

async function resolveBookingContext({ slug, barberId, serviceId }) {
  const barbershop = await Barbershop.findOne({ slug, active: true });
  if (!barbershop) throw new ApiError(404, 'Barbershop not found');

  const barber = await User.findOne({ _id: barberId, barbershop: barbershop._id, role: 'barber', active: true });
  if (!barber) throw new ApiError(404, 'Barber not found');

  const service = await Service.findOne({ _id: serviceId, barbershop: barbershop._id, active: true });
  if (!service) throw new ApiError(404, 'Service not found');

  return { barbershop, barber, service };
}

const getAvailability = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { barberId, serviceId, date } = req.query;

  if (!barberId || !serviceId || !date) {
    throw new ApiError(400, 'barberId, serviceId and date are required');
  }

  const { barber, service } = await resolveBookingContext({ slug, barberId, serviceId });

  const dayStart = parseDateOnly(date);
  if (Number.isNaN(dayStart.getTime())) {
    throw new ApiError(400, 'Invalid date, expected YYYY-MM-DD');
  }
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existingAppointments = await Appointment.find({
    barber: barber._id,
    status: { $in: ACTIVE_STATUSES },
    startTime: { $gte: dayStart, $lt: dayEnd }
  }).select('startTime endTime');

  const slots = getAvailableSlots({
    barber,
    date: dayStart,
    durationMinutes: service.durationMinutes,
    existingAppointments
  });

  res.json({ slots });
});

const create = asyncHandler(async (req, res) => {
  const { slug, barberId, serviceId, startTime } = req.body;
  if (!slug || !barberId || !serviceId || !startTime) {
    throw new ApiError(400, 'slug, barberId, serviceId and startTime are required');
  }

  const { barbershop, barber, service } = await resolveBookingContext({ slug, barberId, serviceId });

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) {
    throw new ApiError(400, 'Invalid startTime');
  }
  const end = new Date(start.getTime() + service.durationMinutes * 60000);

  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existingAppointments = await Appointment.find({
    barber: barber._id,
    status: { $in: ACTIVE_STATUSES },
    startTime: { $gte: dayStart, $lt: dayEnd }
  }).select('startTime endTime');

  const availableSlots = getAvailableSlots({
    barber,
    date: dayStart,
    durationMinutes: service.durationMinutes,
    existingAppointments
  });

  if (!availableSlots.includes(start.toISOString())) {
    throw new ApiError(409, 'The selected slot is no longer available');
  }

  const appointment = await Appointment.create({
    barbershop: barbershop._id,
    barber: barber._id,
    customer: req.user._id,
    service: service._id,
    startTime: start,
    endTime: end,
    status: 'confirmed',
    priceAtBooking: service.price
  });

  res.status(201).json(appointment);
});

const listMine = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'customer') filter.customer = req.user._id;
  else if (req.user.role === 'barber') filter.barber = req.user._id;
  else if (req.user.role === 'owner') filter.barbershop = req.user.barbershop;

  if (req.query.status) filter.status = req.query.status;

  const appointments = await Appointment.find(filter)
    .sort({ startTime: 1 })
    .populate('barber', 'name avatarUrl')
    .populate('customer', 'name phone')
    .populate('service', 'name durationMinutes price');

  res.json(appointments);
});

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
// Barbers can only reject appointments (cancel or mark no-show). Completion is set
// automatically when the service is sold in Ventas — never by a manual status change.
const BARBER_ALLOWED_STATUSES = ['cancelled', 'no_show'];

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  const isOwner = req.user.role === 'owner' && appointment.barbershop.toString() === req.user.barbershop.toString();
  const isAssignedBarber = req.user.role === 'barber' && appointment.barber.toString() === req.user._id.toString();
  if (!isOwner && !isAssignedBarber) {
    throw new ApiError(403, 'You do not have permission to update this appointment');
  }
  if (isAssignedBarber && !BARBER_ALLOWED_STATUSES.includes(status)) {
    throw new ApiError(403, 'Barbers can only cancel or mark appointments as no-show');
  }

  appointment.status = status;
  await appointment.save();
  res.json(appointment);
});

const RESCHEDULABLE_STATUSES = ['pending', 'confirmed'];

const reschedule = asyncHandler(async (req, res) => {
  const { startTime } = req.body;
  if (!startTime) {
    throw new ApiError(400, 'startTime is required');
  }
  const newStart = new Date(startTime);
  if (Number.isNaN(newStart.getTime())) {
    throw new ApiError(400, 'Invalid startTime');
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  const isOwner = req.user.role === 'owner' && appointment.barbershop.toString() === req.user.barbershop.toString();
  const isAssignedBarber = req.user.role === 'barber' && appointment.barber.toString() === req.user._id.toString();
  if (!isOwner && !isAssignedBarber) {
    throw new ApiError(403, 'You do not have permission to reschedule this appointment');
  }
  if (!RESCHEDULABLE_STATUSES.includes(appointment.status)) {
    throw new ApiError(409, 'Only pending or confirmed appointments can be rescheduled');
  }

  // Preserve the originally booked duration regardless of the service's current duration.
  const durationMs = appointment.endTime.getTime() - appointment.startTime.getTime();
  const newEnd = new Date(newStart.getTime() + durationMs);

  // Slot is free if there's no other non-cancelled appointment overlapping it.
  const conflict = await Appointment.findOne({
    _id: { $ne: appointment._id },
    barber: appointment.barber,
    status: { $ne: 'cancelled' },
    startTime: { $lt: newEnd },
    endTime: { $gt: newStart }
  });
  if (conflict) {
    throw new ApiError(409, 'The barber already has an appointment at that time');
  }

  appointment.startTime = newStart;
  appointment.endTime = newEnd;
  await appointment.save();
  res.json(appointment);
});

module.exports = { getAvailability, create, listMine, updateStatus, reschedule };
