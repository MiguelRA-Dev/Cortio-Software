const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  itemType: { type: String, enum: ['Service', 'Product'], required: true },
  item: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'items.itemType' },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  barber: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  source: { type: String, enum: ['appointment', 'walk_in'], default: 'walk_in' },
  items: {
    type: [saleItemSchema],
    required: true,
    validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: 'Sale must have at least one item' }
  },
  total: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'other'], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
