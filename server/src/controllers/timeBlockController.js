const TimeBlock = require('../models/TimeBlock');
const Appointment = require('../models/Appointment');
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
  const { startTime, endTime, reason } = req.body;
  if (!startTime || !endTime) {
    throw new ApiError(400, 'startTime y endTime son requeridos');
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new ApiError(400, 'El rango de horario es inválido');
  }

  const conflict = await Appointment.findOne({
    barber: req.user._id,
    status: { $in: ACTIVE_STATUSES },
    startTime: { $lt: end },
    endTime: { $gt: start }
  });
  if (conflict) {
    throw new ApiError(409, 'Ya tienes una cita agendada en ese horario');
  }

  const block = await TimeBlock.create({
    barbershop: req.user.barbershop,
    barber: req.user._id,
    startTime: start,
    endTime: end,
    reason: reason?.trim() || undefined
  });

  res.status(201).json(block);
});

const remove = asyncHandler(async (req, res) => {
  const block = await TimeBlock.findOneAndDelete({ _id: req.params.id, barber: req.user._id });
  if (!block) {
    throw new ApiError(404, 'Bloqueo no encontrado');
  }
  res.json({ success: true });
});

module.exports = { listMine, create, remove };
