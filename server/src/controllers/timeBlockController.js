const TimeBlock = require('../models/TimeBlock');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const ACTIVE_STATUSES = ['pending', 'confirmed'];

// Same scoping pattern as appointmentController.listMine: a barber sees only their own
// blocks, the owner sees every block across their whole team's agenda.
const listMine = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'owner' ? { barbershop: req.user.barbershop } : { barber: req.user._id };
  const blocks = await TimeBlock.find(filter).sort({ startTime: 1 });
  res.json(blocks);
});

const create = asyncHandler(async (req, res) => {
  const { startTime, endTime, reason, barberId } = req.body;
  if (!startTime || !endTime) {
    throw new ApiError(400, 'startTime y endTime son requeridos');
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new ApiError(400, 'El rango de horario es inválido');
  }

  // Barbers can only block their own agenda. The owner can block their own (if they take
  // appointments themselves) or any barber on their team's — same $or shape as
  // resolveBookingContext, since it's the same "who's a valid bookable person here" check.
  let targetBarberId = req.user._id;
  if (req.user.role === 'owner' && barberId && barberId !== String(req.user._id)) {
    const target = await User.findOne({
      _id: barberId,
      barbershop: req.user.barbershop,
      $or: [{ role: 'barber' }, { role: 'owner', attendsClients: true }]
    });
    if (!target) {
      throw new ApiError(404, 'Profesional no encontrado');
    }
    targetBarberId = target._id;
  }

  const conflict = await Appointment.findOne({
    barber: targetBarberId,
    status: { $in: ACTIVE_STATUSES },
    startTime: { $lt: end },
    endTime: { $gt: start }
  });
  if (conflict) {
    throw new ApiError(409, 'Ya hay una cita agendada en ese horario');
  }

  const block = await TimeBlock.create({
    barbershop: req.user.barbershop,
    barber: targetBarberId,
    startTime: start,
    endTime: end,
    reason: reason?.trim() || undefined
  });

  res.status(201).json(block);
});

const remove = asyncHandler(async (req, res) => {
  // Same scoping as listMine: barbers only manage their own blocks, the owner can clear
  // any block across their team's agenda.
  const filter =
    req.user.role === 'owner'
      ? { _id: req.params.id, barbershop: req.user.barbershop }
      : { _id: req.params.id, barber: req.user._id };
  const block = await TimeBlock.findOneAndDelete(filter);
  if (!block) {
    throw new ApiError(404, 'Bloqueo no encontrado');
  }
  res.json({ success: true });
});

module.exports = { listMine, create, remove };
