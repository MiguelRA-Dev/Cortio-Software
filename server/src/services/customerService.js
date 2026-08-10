const Appointment = require('../models/Appointment');
const Sale = require('../models/Sale');

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

  // Walk-in sales with no appointment (e.g. a manually-added customer's first ring-up)
  // are the only trace those customers leave — without this pass they'd never appear
  // here until/unless they eventually also book a real appointment.
  const walkInSales = await Sale.find({ barbershop: barbershopId, appointment: null, customer: { $ne: null } })
    .populate('customer', 'name email phone')
    .populate('barber', 'name')
    .sort({ createdAt: 1 });

  for (const sale of walkInSales) {
    if (!sale.customer) continue;
    const key = sale.customer._id.toString();

    if (!map.has(key)) {
      map.set(key, {
        id: sale.customer._id,
        name: sale.customer.name,
        email: sale.customer.email,
        phone: sale.customer.phone,
        totalVisits: 0,
        totalSpent: 0,
        firstVisit: null,
        lastVisit: null,
        firstActivity: sale.createdAt,
        lastActivity: sale.createdAt,
        barberCounts: {},
        serviceCounts: {},
      });
    }

    const entry = map.get(key);
    if (sale.createdAt < entry.firstActivity) entry.firstActivity = sale.createdAt;
    if (sale.createdAt > entry.lastActivity) entry.lastActivity = sale.createdAt;
    entry.totalVisits += 1;
    entry.totalSpent += sale.total;
    if (!entry.firstVisit || sale.createdAt < entry.firstVisit) entry.firstVisit = sale.createdAt;
    if (!entry.lastVisit || sale.createdAt > entry.lastVisit) entry.lastVisit = sale.createdAt;
    if (sale.barber) {
      entry.barberCounts[sale.barber.name] = (entry.barberCounts[sale.barber.name] || 0) + 1;
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
