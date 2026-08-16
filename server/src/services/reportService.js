const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const PayrollEntry = require('../models/PayrollEntry');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');
const User = require('../models/User');
const Barbershop = require('../models/Barbershop');
const { bogotaDateParts, bogotaDateKey } = require('../utils/bogotaTime');

function dateRangeFilter(from, to) {
  const filter = {};
  if (from) filter.$gte = new Date(from);
  if (to) filter.$lte = new Date(to);
  return Object.keys(filter).length ? filter : undefined;
}

async function computeSummaryTotals(barbershopId, from, to, barberId) {
  const range = dateRangeFilter(from, to);

  const saleFilter = { barbershop: barbershopId };
  if (range) saleFilter.createdAt = range;
  if (barberId) saleFilter.barber = barberId;
  const sales = await Sale.find(saleFilter).select('total');
  const totalIncome = sales.reduce((sum, s) => sum + s.total, 0);

  // Expenses (rent, supplies, ...) are never attributed to one professional — the
  // model has no way to, so this stays at the whole-shop total even when barberId is
  // set. The caller is expected to make that clear in the UI rather than silently
  // showing a number that looks scoped but isn't.
  const expenseFilter = { barbershop: barbershopId };
  if (range) expenseFilter.date = range;
  const expenses = await Expense.find(expenseFilter).select('amount');
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Paid payroll is a real labor cost but lives in its own collection (not Expense),
  // so it has to be pulled in separately to land in the same profitability picture.
  const payrollFilter = { barbershop: barbershopId, status: 'paid' };
  if (range) payrollFilter.paidAt = range;
  if (barberId) payrollFilter.barber = barberId;
  const payrollEntries = await PayrollEntry.find(payrollFilter).select('netAmount');
  const totalPayroll = payrollEntries.reduce((sum, p) => sum + p.netAmount, 0);

  return {
    totalIncome,
    totalExpenses,
    totalPayroll,
    netProfit: totalIncome - totalExpenses - totalPayroll,
    salesCount: sales.length,
    averageTicket: sales.length ? totalIncome / sales.length : 0
  };
}

// An immediately-preceding period of equal length to [from, to], clamped to never
// start before the barbershop existed — otherwise a shop created 3 weeks ago viewing
// "this month" would get a "previous month" comparison against a period with no data
// for a reason that has nothing to do with performance. Returns null when there's no
// meaningful period to compare against (clamping collapses the range to nothing).
async function resolvePreviousRange(barbershopId, from, to) {
  if (!from || !to) return null;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const lengthMs = toDate.getTime() - fromDate.getTime();
  if (lengthMs <= 0) return null;

  const barbershop = await Barbershop.findById(barbershopId).select('createdAt');
  const prevTo = new Date(fromDate.getTime() - 1);
  let prevFrom = new Date(fromDate.getTime() - lengthMs);
  if (barbershop && prevFrom < barbershop.createdAt) prevFrom = barbershop.createdAt;
  if (prevFrom >= prevTo) return null;

  return { prevFrom: prevFrom.toISOString(), prevTo: prevTo.toISOString() };
}

// Percent change from `prev` to `curr`, rounded to 1 decimal. A zero-base delta isn't
// expressible as a percentage (division by zero) — null unless curr is also zero, in
// which case "no change" (0) is the honest answer.
function pctDelta(curr, prev, { allowNegativeBase = true } = {}) {
  if (prev === 0) return curr === 0 ? 0 : null;
  if (!allowNegativeBase && prev < 0) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

async function getSummary(barbershopId, from, to, barberId) {
  const current = await computeSummaryTotals(barbershopId, from, to, barberId);
  const prevRange = await resolvePreviousRange(barbershopId, from, to);
  if (!prevRange) return { ...current, previous: null, deltas: null };

  const previous = await computeSummaryTotals(barbershopId, prevRange.prevFrom, prevRange.prevTo, barberId);
  const deltas = {
    totalIncome: pctDelta(current.totalIncome, previous.totalIncome),
    totalExpenses: pctDelta(current.totalExpenses, previous.totalExpenses),
    totalPayroll: pctDelta(current.totalPayroll, previous.totalPayroll),
    // A loss shrinking from -100k to -50k is a real improvement, but as a % of a
    // negative base it reads like a huge decline — null is more honest than misleading.
    netProfit: pctDelta(current.netProfit, previous.netProfit, { allowNegativeBase: false }),
    salesCount: pctDelta(current.salesCount, previous.salesCount),
    averageTicket: pctDelta(current.averageTicket, previous.averageTicket)
  };
  return { ...current, previous, deltas };
}

function dayjsRangeDays(dayStart, dayEnd) {
  const days = [];
  const cursor = new Date(dayStart);
  while (cursor < dayEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

async function getByBarber(barbershopId, from, to) {
  const range = dateRangeFilter(from, to);
  const barbers = await User.find({ barbershop: barbershopId, role: 'barber' }).select(
    'name schedule scheduleExceptions'
  );

  const appointmentFilter = { barbershop: barbershopId, status: 'completed' };
  if (range) appointmentFilter.startTime = range;
  const appointments = await Appointment.find(appointmentFilter).populate('service', 'durationMinutes');

  const saleFilter = { barbershop: barbershopId, barber: { $ne: null } };
  if (range) saleFilter.createdAt = range;
  const sales = await Sale.find(saleFilter).select('barber source');

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  const days = fromDate && toDate ? dayjsRangeDays(fromDate, toDate) : [];

  return barbers.map((barber) => {
    const barberAppointments = appointments.filter((a) => a.barber.toString() === barber._id.toString());
    const servicesCount = barberAppointments.length;
    const revenue = barberAppointments.reduce((sum, a) => sum + a.priceAtBooking, 0);
    const bookedMinutes = barberAppointments.reduce(
      (sum, a) => sum + (a.service ? a.service.durationMinutes : 0),
      0
    );

    let availableMinutes = 0;
    for (const day of days) {
      const { dayOfWeek } = bogotaDateParts(day);
      const dateKey = bogotaDateKey(day);
      const exception = (barber.scheduleExceptions || []).find(
        (ex) => bogotaDateKey(new Date(ex.date)) === dateKey
      );
      if (exception) {
        if (!exception.available) continue;
        const [sh, sm] = exception.startTime.split(':').map(Number);
        const [eh, em] = exception.endTime.split(':').map(Number);
        availableMinutes += eh * 60 + em - (sh * 60 + sm);
      } else {
        for (const workRange of (barber.schedule || []).filter((s) => s.dayOfWeek === dayOfWeek)) {
          const [sh, sm] = workRange.startTime.split(':').map(Number);
          const [eh, em] = workRange.endTime.split(':').map(Number);
          availableMinutes += eh * 60 + em - (sh * 60 + sm);
        }
      }
    }

    const barberSales = sales.filter((s) => s.barber.toString() === barber._id.toString());
    const appointmentSales = barberSales.filter((s) => s.source === 'appointment').length;
    const walkInSales = barberSales.filter((s) => s.source === 'walk_in').length;

    return {
      barberId: barber._id,
      name: barber.name,
      servicesCount,
      revenue,
      occupancyRate: availableMinutes > 0 ? Math.min(bookedMinutes / availableMinutes, 1) : null,
      appointmentSales,
      walkInSales
    };
  });
}

async function getByService(barbershopId, from, to, barberId) {
  const range = dateRangeFilter(from, to);
  const filter = { barbershop: barbershopId, status: 'completed' };
  if (range) filter.startTime = range;
  if (barberId) filter.barber = barberId;

  const appointments = await Appointment.find(filter).populate('service', 'name');

  const grouped = new Map();
  for (const appt of appointments) {
    if (!appt.service) continue;
    const key = appt.service._id.toString();
    if (!grouped.has(key)) {
      grouped.set(key, { serviceId: appt.service._id, name: appt.service.name, count: 0, revenue: 0 });
    }
    const entry = grouped.get(key);
    entry.count += 1;
    entry.revenue += appt.priceAtBooking;
  }

  return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue);
}

// Only appointments that reached a terminal state count toward the rate — a
// still-confirmed future appointment hasn't had a chance to be cancelled yet, so
// including it would just dilute the rate with bookings that aren't done playing out.
const RESOLVED_STATUSES = ['completed', 'cancelled', 'no_show'];

function summarizeCancellations(list) {
  const resolvedCount = list.length;
  const completedCount = list.filter((a) => a.status === 'completed').length;
  const cancelledList = list.filter((a) => a.status === 'cancelled');
  const cancelledCount = cancelledList.length;
  const noShowCount = list.filter((a) => a.status === 'no_show').length;
  return {
    resolvedCount,
    completedCount,
    cancelledCount,
    noShowCount,
    cancellationRate: resolvedCount ? Math.round((cancelledCount / resolvedCount) * 1000) / 10 : null,
    noShowRate: resolvedCount ? Math.round((noShowCount / resolvedCount) * 1000) / 10 : null,
    // no_show never carries cancelledBy (only set for status: cancelled), so it's
    // correctly absent from this breakdown.
    cancelledByBreakdown: {
      owner: cancelledList.filter((a) => a.cancelledBy === 'owner').length,
      barber: cancelledList.filter((a) => a.cancelledBy === 'barber').length,
      customer: cancelledList.filter((a) => a.cancelledBy === 'customer').length
    }
  };
}

async function getCancellations(barbershopId, from, to) {
  const range = dateRangeFilter(from, to);
  const barbers = await User.find({ barbershop: barbershopId, role: 'barber' }).select('name');

  const filter = { barbershop: barbershopId, status: { $in: RESOLVED_STATUSES } };
  if (range) filter.startTime = range;
  const appointments = await Appointment.find(filter).select('barber status cancelledBy');

  return {
    overall: summarizeCancellations(appointments),
    byBarber: barbers.map((b) => ({
      barberId: b._id,
      name: b.name,
      ...summarizeCancellations(appointments.filter((a) => a.barber.toString() === b._id.toString()))
    }))
  };
}

function summarizeRatings(list) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of list) distribution[r.rating] += 1;
  const count = list.length;
  const average = count ? Math.round((list.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 : null;
  return { count, average, distribution };
}

// Filtered by the underlying appointment's startTime, not Review.createdAt — a review
// submitted this week for a haircut from last month belongs in last month's report,
// same as that haircut's revenue already does. Keeps this consistent with every other
// metric on the page, which is scoped to when the service happened.
async function getRatings(barbershopId, from, to) {
  const barbers = await User.find({ barbershop: barbershopId, role: 'barber' }).select('name');
  const reviews = await Review.find({ barbershop: barbershopId })
    .select('rating barber appointment')
    .populate('appointment', 'startTime');

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  const inRange = reviews.filter((r) => {
    if (!r.appointment) return false;
    const t = r.appointment.startTime;
    return (!fromDate || t >= fromDate) && (!toDate || t <= toDate);
  });

  return {
    overall: summarizeRatings(inRange),
    byBarber: barbers.map((b) => ({
      barberId: b._id,
      name: b.name,
      ...summarizeRatings(inRange.filter((r) => r.barber.toString() === b._id.toString()))
    }))
  };
}

// Same appointment.startTime scoping as getRatings, for consistency, sorted by
// submission time so the newest feedback surfaces first regardless of when the
// underlying appointment happened within the range. Paginated because a shop with a
// lot of history can have far more reviews than anyone wants dumped in one list.
async function getRecentReviews(barbershopId, from, to, page = 1, pageSize = 10) {
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const reviews = await Review.find({ barbershop: barbershopId })
    .select('rating comment barber customer appointment createdAt')
    .populate('appointment', 'startTime')
    .populate('barber', 'name')
    .populate('customer', 'name')
    .sort({ createdAt: -1 });

  const inRange = reviews.filter((r) => {
    if (!r.appointment) return false;
    const t = r.appointment.startTime;
    return (!fromDate || t >= fromDate) && (!toDate || t <= toDate);
  });

  const total = inRange.length;
  const start = (page - 1) * pageSize;
  const items = inRange.slice(start, start + pageSize).map((r) => ({
    id: r._id,
    rating: r.rating,
    comment: r.comment || null,
    barberName: r.barber?.name || null,
    customerName: r.customer?.name || null,
    createdAt: r.createdAt
  }));

  return { items, total, page, pageSize };
}

module.exports = { getSummary, getByBarber, getByService, getCancellations, getRatings, getRecentReviews };
