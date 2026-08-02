const Appointment = require('../models/Appointment');

async function calculateGross(barber, periodStart, periodEnd) {
  let servicesCount = 0;
  let commissionBase = 0;

  if (barber.paymentScheme === 'commission' || barber.paymentScheme === 'mixed') {
    const appointments = await Appointment.find({
      barber: barber._id,
      status: 'completed',
      startTime: { $gte: periodStart, $lte: periodEnd }
    }).select('priceAtBooking');

    servicesCount = appointments.length;
    commissionBase = appointments.reduce((sum, a) => sum + a.priceAtBooking, 0);
  }

  let grossAmount = 0;
  if (barber.paymentScheme === 'fixed') {
    grossAmount = barber.baseSalary || 0;
  } else if (barber.paymentScheme === 'commission') {
    grossAmount = commissionBase * ((barber.commissionRate || 0) / 100);
  } else if (barber.paymentScheme === 'mixed') {
    grossAmount = (barber.baseSalary || 0) + commissionBase * ((barber.commissionRate || 0) / 100);
  }

  return { grossAmount, commissionBase, servicesCount };
}

module.exports = { calculateGross };
