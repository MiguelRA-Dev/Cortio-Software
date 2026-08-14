require('dotenv').config({ quiet: true });
const cron = require('node-cron');
const app = require('./app');
const connectDB = require('./src/config/db');
const { runDeletionJob } = require('./src/jobs/deletionJob');
const { runReminderJob } = require('./src/jobs/reminderJob');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // No billing cron — each billing period is a Checkout Pro link the owner pays
    // manually from /billing, and MercadoPago reports the result via the
    // /billing/webhook route (see billingController.handleWebhook). Nothing recurs
    // automatically, so there's nothing to schedule here.

    // Daily purge run — permanently deletes barbershops whose 15-day deletion grace
    // period has elapsed.
    cron.schedule('0 7 * * *', () => {
      runDeletionJob().catch((err) => console.error('[deletionJob] Unexpected failure:', err));
    });

    // WhatsApp reminder — checks every 5 minutes for appointments starting within the
    // next ~65 minutes (see reminderJob.js for the exact window logic).
    cron.schedule('*/5 * * * *', () => {
      runReminderJob().catch((err) => console.error('[reminderJob] Unexpected failure:', err));
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
