// One-off migration: grandfathers in barbershops that existed before the trial/subscription
// system shipped, so they don't get locked out by requireActiveSubscription on next request.
// Run once manually: node scripts/backfillSubscriptions.js
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Barbershop = require('../src/models/Barbershop');

async function run() {
  await connectDB();

  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 1);

  const result = await Barbershop.updateMany(
    { subscriptionStatus: { $in: [null, 'trialing'] }, trialEndsAt: { $exists: false } },
    { $set: { subscriptionStatus: 'active', currentPeriodEnd: farFuture } }
  );

  console.log(`Backfilled ${result.modifiedCount} barbershop(s) to active with currentPeriodEnd = ${farFuture.toISOString()}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
