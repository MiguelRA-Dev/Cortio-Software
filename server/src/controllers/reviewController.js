const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const { appointmentId, rating, comment } = req.body;

  if (!appointmentId) {
    throw new ApiError(400, 'appointmentId es requerido');
  }
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new ApiError(400, 'rating debe ser un número entero entre 1 y 5');
  }

  const appointment = await Appointment.findOne({ _id: appointmentId, customer: req.user._id });
  if (!appointment) {
    throw new ApiError(404, 'Cita no encontrada');
  }
  if (appointment.status !== 'completed') {
    throw new ApiError(409, 'Solo puedes calificar una cita completada');
  }

  const existing = await Review.findOne({ appointment: appointment._id });
  if (existing) {
    throw new ApiError(409, 'Esta cita ya fue calificada');
  }

  const review = await Review.create({
    appointment: appointment._id,
    barbershop: appointment.barbershop,
    customer: req.user._id,
    barber: appointment.barber,
    rating: numericRating,
    comment
  });

  res.status(201).json(review);
});

const listMine = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ customer: req.user._id }).sort({ createdAt: -1 });
  res.json(reviews);
});

module.exports = { create, listMine };
