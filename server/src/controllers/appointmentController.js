const Appointment = require('../models/Appointment');
const Barbershop = require('../models/Barbershop');
const Service = require('../models/Service');
const User = require('../models/User');
const TimeBlock = require('../models/TimeBlock');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getAvailableSlots } = require('../services/availabilityService');
const parseDateOnly = require('../utils/parseDateOnly');
const { bogotaMidnightOf } = require('../utils/bogotaTime');
const {
  notifyAppointmentCreated,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled
} = require('../services/whatsappService');

// Fetches just the fields the WhatsApp templates need, without disturbing the raw
// ObjectId fields callers already used for authorization checks above. `phone` and
// `whatsappNotificationsEnabled` both have to be selected here — shouldNotify() reads
// the latter, and a barber populated without it would silently look like they never
// opted out, since `undefined === false` is false.
async function loadNotificationContext(appointmentId) {
  return Appointment.findById(appointmentId)
    .populate('barber', 'phone whatsappNotificationsEnabled')
    .populate('customer', 'name')
    .populate('service', 'name')
    .populate('barbershop', 'subscriptionStatus');
}

const ONE_DAY_MS = 24 * 60 * 60000;

const ACTIVE_STATUSES = ['pending', 'confirmed'];

async function resolveBookingContext({ slug, barberId, serviceId }) {
  const barbershop = await Barbershop.findOne({ slug, active: true });
  if (!barbershop) throw new ApiError(404, 'Establecimiento no encontrado');

  // A bookable barber, or the owner if they've opted in to take appointments themselves
  // (User.attendsClients — same account, no separate barber login).
  const barber = await User.findOne({
    _id: barberId,
    barbershop: barbershop._id,
    active: true,
    $or: [{ role: 'barber' }, { role: 'owner', attendsClients: true }]
  });
  if (!barber) throw new ApiError(404, 'Profesional no encontrado');

  const service = await Service.findOne({ _id: serviceId, barbershop: barbershop._id, active: true });
  if (!service) throw new ApiError(404, 'Servicio no encontrado');

  // Empty barber.services means "no restriction" (see User.js) — only enforce the
  // allowlist when the barber actually has one set.
  if (barber.services.length > 0) {
    const canPerform = barber.services.some((id) => id.toString() === service._id.toString());
    if (!canPerform) {
      throw new ApiError(409, 'Este profesional no realiza el servicio seleccionado');
    }
  }

  return { barbershop, barber, service };
}

const getAvailability = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { barberId, serviceId, date } = req.query;

  if (!barberId || !serviceId || !date) {
    throw new ApiError(400, 'barberId, serviceId y date son requeridos');
  }

  const { barber, service } = await resolveBookingContext({ slug, barberId, serviceId });

  const dayStart = parseDateOnly(date);
  if (Number.isNaN(dayStart.getTime())) {
    throw new ApiError(400, 'Fecha inválida, se espera YYYY-MM-DD');
  }
  const dayEnd = new Date(dayStart.getTime() + ONE_DAY_MS);

  const [existingAppointments, blocks] = await Promise.all([
    Appointment.find({
      barber: barber._id,
      status: { $in: ACTIVE_STATUSES },
      startTime: { $gte: dayStart, $lt: dayEnd }
    }).select('startTime endTime'),
    TimeBlock.find({ barber: barber._id, startTime: { $gte: dayStart, $lt: dayEnd } }).select('startTime endTime')
  ]);

  const slots = getAvailableSlots({
    barber,
    date: dayStart,
    durationMinutes: service.durationMinutes,
    busyRanges: [...existingAppointments, ...blocks]
  });

  res.json({ slots });
});

const create = asyncHandler(async (req, res) => {
  const { slug, barberId, serviceId, startTime } = req.body;
  if (!slug || !barberId || !serviceId || !startTime) {
    throw new ApiError(400, 'slug, barberId, serviceId y startTime son requeridos');
  }

  const { barbershop, barber, service } = await resolveBookingContext({ slug, barberId, serviceId });

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) {
    throw new ApiError(400, 'startTime inválido');
  }
  const end = new Date(start.getTime() + service.durationMinutes * 60000);

  const dayStart = bogotaMidnightOf(start);
  const dayEnd = new Date(dayStart.getTime() + ONE_DAY_MS);

  const [existingAppointments, blocks] = await Promise.all([
    Appointment.find({
      barber: barber._id,
      status: { $in: ACTIVE_STATUSES },
      startTime: { $gte: dayStart, $lt: dayEnd }
    }).select('startTime endTime'),
    TimeBlock.find({ barber: barber._id, startTime: { $gte: dayStart, $lt: dayEnd } }).select('startTime endTime')
  ]);

  const availableSlots = getAvailableSlots({
    barber,
    date: dayStart,
    durationMinutes: service.durationMinutes,
    busyRanges: [...existingAppointments, ...blocks]
  });

  if (!availableSlots.includes(start.toISOString())) {
    throw new ApiError(409, 'El horario seleccionado ya no está disponible');
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

  await notifyAppointmentCreated({
    barber,
    customer: req.user,
    service,
    startTime: start,
    subscriptionStatus: barbershop.subscriptionStatus
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
    throw new ApiError(400, `status debe ser uno de: ${VALID_STATUSES.join(', ')}`);
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(404, 'Cita no encontrada');
  }

  const isOwner = req.user.role === 'owner' && appointment.barbershop.toString() === req.user.barbershop.toString();
  const isAssignedBarber = req.user.role === 'barber' && appointment.barber.toString() === req.user._id.toString();
  if (!isOwner && !isAssignedBarber) {
    throw new ApiError(403, 'No tienes permiso para modificar esta cita');
  }
  if (isAssignedBarber && !BARBER_ALLOWED_STATUSES.includes(status)) {
    throw new ApiError(403, 'Los profesionales solo pueden cancelar o marcar citas como no asistió');
  }

  appointment.status = status;
  appointment.cancelledBy = status === 'cancelled' ? req.user.role : undefined;
  await appointment.save();

  if (status === 'cancelled') {
    const ctx = await loadNotificationContext(appointment._id);
    await notifyAppointmentCancelled({
      barber: ctx.barber,
      customer: ctx.customer,
      service: ctx.service,
      startTime: ctx.startTime,
      subscriptionStatus: ctx.barbershop.subscriptionStatus
    });
  }

  res.json(appointment);
});

const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

const cancelMine = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, customer: req.user._id });
  if (!appointment) {
    throw new ApiError(404, 'Cita no encontrada');
  }
  if (!CANCELLABLE_STATUSES.includes(appointment.status)) {
    throw new ApiError(409, 'Esta cita ya no se puede cancelar');
  }

  appointment.status = 'cancelled';
  appointment.cancelledBy = 'customer';
  await appointment.save();

  const ctx = await loadNotificationContext(appointment._id);
  await notifyAppointmentCancelled({
    barber: ctx.barber,
    customer: ctx.customer,
    service: ctx.service,
    startTime: ctx.startTime,
    subscriptionStatus: ctx.barbershop.subscriptionStatus
  });

  res.json(appointment);
});

const RESCHEDULABLE_STATUSES = ['pending', 'confirmed'];

const reschedule = asyncHandler(async (req, res) => {
  const { startTime } = req.body;
  if (!startTime) {
    throw new ApiError(400, 'startTime es requerido');
  }
  const newStart = new Date(startTime);
  if (Number.isNaN(newStart.getTime())) {
    throw new ApiError(400, 'startTime inválido');
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(404, 'Cita no encontrada');
  }

  const isOwner = req.user.role === 'owner' && appointment.barbershop.toString() === req.user.barbershop.toString();
  const isAssignedBarber = req.user.role === 'barber' && appointment.barber.toString() === req.user._id.toString();
  if (!isOwner && !isAssignedBarber) {
    throw new ApiError(403, 'No tienes permiso para reprogramar esta cita');
  }
  if (!RESCHEDULABLE_STATUSES.includes(appointment.status)) {
    throw new ApiError(409, 'Solo se pueden reprogramar citas pendientes o confirmadas');
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
    throw new ApiError(409, 'El profesional ya tiene una cita a esa hora');
  }

  const blockConflict = await TimeBlock.findOne({
    barber: appointment.barber,
    startTime: { $lt: newEnd },
    endTime: { $gt: newStart }
  });
  if (blockConflict) {
    throw new ApiError(409, 'El profesional tiene ese horario bloqueado');
  }

  appointment.startTime = newStart;
  appointment.endTime = newEnd;
  // New time means the reminder window has to be recomputed — otherwise a reminder
  // already sent for the old time would suppress the one due for the new time.
  appointment.reminderSentAt = undefined;
  await appointment.save();

  const ctx = await loadNotificationContext(appointment._id);
  await notifyAppointmentRescheduled({
    barber: ctx.barber,
    customer: ctx.customer,
    service: ctx.service,
    startTime: ctx.startTime,
    subscriptionStatus: ctx.barbershop.subscriptionStatus
  });

  res.json(appointment);
});

module.exports = { getAvailability, create, listMine, updateStatus, cancelMine, reschedule };
