const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const PayrollEntry = require('../models/PayrollEntry');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { bogotaDateParts, bogotaDateKey } = require('../utils/bogotaTime');

function dateRangeFilter(from, to) {
  const filter = {};
  if (from) filter.$gte = new Date(from);
  if (to) filter.$lte = new Date(to);
  return Object.keys(filter).length ? filter : undefined;
}

async function getSummary(barbershopId, from, to) {
  const range = dateRangeFilter(from, to);

  const saleFilter = { barbershop: barbershopId };
  if (range) saleFilter.createdAt = range;
  const sales = await Sale.find(saleFilter).select('total');
  const totalIncome = sales.reduce((sum, s) => sum + s.total, 0);

  const expenseFilter = { barbershop: barbershopId };
  if (range) expenseFilter.date = range;
  const expenses = await Expense.find(expenseFilter).select('amount');
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Paid payroll is a real labor cost but lives in its own collection (not Expense),
  // so it has to be pulled in separately to land in the same profitability picture.
  const payrollFilter = { barbershop: barbershopId, status: 'paid' };
  if (range) payrollFilter.paidAt = range;
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

async function getByService(barbershopId, from, to) {
  const range = dateRangeFilter(from, to);
  const filter = { barbershop: barbershopId, status: 'completed' };
  if (range) filter.startTime = range;

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

module.exports = { getSummary, getByBarber, getByService };
