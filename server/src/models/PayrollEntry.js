const mongoose = require('mongoose');

const payrollLineSchema = new mongoose.Schema({
  type: { type: String, enum: ['bonus', 'deduction'], required: true },
  label: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const payrollEntrySchema = new mongoose.Schema({
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  barber: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  grossAmount: { type: Number, required: true, min: 0 },
  lines: { type: [payrollLineSchema], default: [] },
  netAmount: { type: Number, required: true, min: 0 },
  // Snapshot of the Sale documents that made up grossAmount, kept even if those sales are later edited.
  sales: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }],
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'other'] },
  paidAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('PayrollEntry', payrollEntrySchema);
