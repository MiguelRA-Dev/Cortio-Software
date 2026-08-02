const mongoose = require('mongoose');

const portfolioPhotoSchema = new mongoose.Schema({
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  barber: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  imageUrl: { type: String, required: true },
  description: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('PortfolioPhoto', portfolioPhotoSchema);
