const mongoose = require('mongoose');

// A barber's self-declared "not available" window (time off, break, personal errand).
// Kept separate from Appointment (which requires a real customer/service) instead of
// reusing User.scheduleExceptions, which only supports one row per calendar day and
// can't express "blocked 2-4pm, available the rest of the day."
const timeBlockSchema = new mongoose.Schema({
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  barber: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  reason: { type: String, trim: true }
}, { timestamps: true });

timeBlockSchema.index({ barber: 1, startTime: 1 });

module.exports = mongoose.model('TimeBlock', timeBlockSchema);
