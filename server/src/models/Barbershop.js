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
  location: { type: String, trim: true },
  address: { type: String, trim: true },
  addressDetails: { type: String, trim: true },
  phone: { type: String, trim: true },
  logoUrl: { type: String },
  businessHours: [businessHoursSchema],
  active: { type: Boolean, default: true },

  subscriptionStatus: { type: String, enum: ['trialing', 'active', 'past_due', 'canceled'], default: 'trialing' },
  trialEndsAt: { type: Date },
  currentPeriodEnd: { type: Date },
  mercadopagoCardBrand: { type: String },
  // Guards against double-applying the same payment if the webhook fires more than once
  // for it (MercadoPago's delivery is at-least-once, not exactly-once).
  lastPaymentReference: { type: String },
  // Owner asked to stop renewing. Since billing is a manual Checkout Pro link each
  // period (not a recurring mandate), this doesn't cancel anything on MercadoPago's
  // side — it just means "don't nag me to pay again," and blocks access naturally once
  // currentPeriodEnd passes via the existing isBlocked() date check.
  cancelAtPeriodEnd: { type: Boolean, default: false },

  // Self-service "delete my barbershop": set together when the owner requests it, and
  // both cleared if they cancel within the grace window. deletionJob purges everything
  // once scheduledPurgeAt has passed.
  deletionRequestedAt: { type: Date },
  scheduledPurgeAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Barbershop', barbershopSchema);
