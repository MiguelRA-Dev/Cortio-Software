const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  durationMinutes: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, trim: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
