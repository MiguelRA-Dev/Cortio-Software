const mongoose = require('mongoose');

const businessHoursSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  closed: { type: Boolean, default: false }
}, { _id: false });

const barbershopSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  address: { type: String, trim: true },
  phone: { type: String, trim: true },
  logoUrl: { type: String },
  businessHours: [businessHoursSchema],
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Barbershop', barbershopSchema);
