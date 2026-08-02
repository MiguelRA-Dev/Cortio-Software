const Appointment = require('../models/Appointment');

async function getCustomers(barbershopId) {
  const appointments = await Appointment.find({ barbershop: barbershopId, status: { $ne: 'cancelled' } })
    .populate('customer', 'name email phone')
    .populate('barber', 'name')
    .populate('service', 'name')
    .sort({ startTime: 1 });

  const map = new Map();

  for (const appt of appointments) {
    if (!appt.customer) continue;
    const key = appt.customer._id.toString();

    if (!map.has(key)) {
      map.set(key, {
        id: appt.customer._id,
        name: appt.customer.name,
        email: appt.customer.email,
        phone: appt.customer.phone,
        totalVisits: 0,
        totalSpent: 0,
        firstVisit: null,
        lastVisit: null,
        // Fallback window for customers with no completed visit yet (e.g. a first
        // booking still pending) so they still get a sensible first/last activity date.
        firstActivity: appt.startTime,
        lastActivity: appt.startTime,
        barberCounts: {},
        serviceCounts: {},
      });
    }

    const entry = map.get(key);
    if (appt.startTime < entry.firstActivity) entry.firstActivity = appt.startTime;
    if (appt.startTime > entry.lastActivity) entry.lastActivity = appt.startTime;

    if (appt.status === 'completed') {
      entry.totalVisits += 1;
      entry.totalSpent += appt.priceAtBooking;
      if (!entry.firstVisit || appt.startTime < entry.firstVisit) entry.firstVisit = appt.startTime;
      if (!entry.lastVisit || appt.startTime > entry.lastVisit) entry.lastVisit = appt.startTime;

      if (appt.barber) {
        entry.barberCounts[appt.barber.name] = (entry.barberCounts[appt.barber.name] || 0) + 1;
      }
      if (appt.service) {
        entry.serviceCounts[appt.service.name] = (entry.serviceCounts[appt.service.name] || 0) + 1;
      }
    }
  }

  return Array.from(map.values()).map(
    ({ barberCounts, serviceCounts, firstActivity, lastActivity, ...entry }) => {
      const favoriteBarber = Object.entries(barberCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const favoriteService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      return {
        ...entry,
        firstVisit: entry.firstVisit || firstActivity,
        lastVisit: entry.lastVisit || lastActivity,
        favoriteBarber,
        favoriteService,
      };
    }
  );
}

module.exports = { getCustomers };
