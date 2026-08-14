const Appointment = require('../models/Appointment');
const { notifyAppointmentReminder } = require('../services/whatsappService');

const REMINDER_LEAD_MINUTES = 60;
const REMINDER_WINDOW_MINUTES = 65;
const ACTIVE_STATUSES = ['pending', 'confirmed'];

// Runs every few minutes (see server.js): sends the pre-appointment WhatsApp reminder to
// the barber once startTime falls inside the next ~65 minutes. reminderSentAt guards
// against sending it twice; the window is wider than the cron interval so a delayed or
// missed run still catches appointments before they start rather than skipping them.
async function runReminderJob() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60000);

  const due = await Appointment.find({
    status: { $in: ACTIVE_STATUSES },
    reminderSentAt: { $exists: false },
    startTime: { $gt: now, $lte: windowEnd }
  })
    .populate('barber', 'phone')
    .populate('customer', 'name')
    .populate('service', 'name');

  for (const appointment of due) {
    try {
      await notifyAppointmentReminder({
        barber: appointment.barber,
        customer: appointment.customer,
        service: appointment.service,
        startTime: appointment.startTime
      });
      appointment.reminderSentAt = now;
      await appointment.save();
    } catch (err) {
      console.error(`[reminderJob] Failed to remind for appointment ${appointment._id}:`, err.message);
    }
  }
}

module.exports = { runReminderJob, REMINDER_LEAD_MINUTES };
