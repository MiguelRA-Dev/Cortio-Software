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
  // MercadoPago Preapproval id — the recurring subscription itself, not a single charge.
  mercadopagoPreapprovalId: { type: String },
  mercadopagoCardBrand: { type: String },
  // Set right before redirecting the owner to MercadoPago's hosted checkout, so that when
  // they land back on /billing we can find "the subscription that was just authorized"
  // among all of this app's subscriptions (MercadoPago's checkout link doesn't accept an
  // external_reference to tag it with up front — see mercadopagoService.claimSubscription).
  mercadopagoCheckoutStartedAt: { type: Date },
  // Guards against double-applying the same authorized_payment if the webhook fires more
  // than once for it (MercadoPago's delivery is at-least-once, not exactly-once).
  lastPaymentReference: { type: String },

  // Self-service "delete my barbershop": set together when the owner requests it, and
  // both cleared if they cancel within the grace window. deletionJob purges everything
  // once scheduledPurgeAt has passed.
  deletionRequestedAt: { type: Date },
  scheduledPurgeAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Barbershop', barbershopSchema);
