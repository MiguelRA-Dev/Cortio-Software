const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  barber: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },
  priceAtBooking: { type: Number, required: true, min: 0 },
  notes: { type: String, trim: true }
}, { timestamps: true });

appointmentSchema.index({ barber: 1, startTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
