const mongoose = require('mongoose');

const workingHoursSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
}, { _id: false });

const scheduleExceptionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  available: { type: Boolean, default: false },
  startTime: { type: String },
  endTime: { type: String }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, trim: true },
  role: { type: String, enum: ['owner', 'barber', 'customer'], required: true },
  // Collected from barbershop owners at registration — ties the account to a real
  // person (dedup across emails) and is required again by MercadoPago to tokenize a card.
  identificationType: { type: String, enum: ['CC', 'CE', 'NIT', 'PA'] },
  identificationNumber: { type: String, trim: true },
  avatarUrl: { type: String },
  active: { type: Boolean, default: true },

  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },

  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },

  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop' },

  paymentScheme: { type: String, enum: ['commission', 'fixed', 'mixed'] },
  commissionRate: { type: Number, min: 0, max: 100 },
  baseSalary: { type: Number, min: 0 },
  schedule: [workingHoursSchema],
  scheduleExceptions: [scheduleExceptionSchema]
}, { timestamps: true });

// Sparse so barbers/customers (who never set this) don't collide on a shared null value.
userSchema.index({ identificationNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
