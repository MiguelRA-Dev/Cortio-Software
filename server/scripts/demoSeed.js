// One-off script to inject/remove an isolated demo barbershop with ~35 days of
// realistic historical data, for manual review in a shared dev database that
// already has real records. Everything created here is scoped to a single
// barbershop (slug DEMO_SLUG) plus customer users tagged with DEMO_EMAIL_DOMAIN,
// so `cleanup` can remove exactly (and only) what `create` inserted.
//
// Usage:
//   node scripts/demoSeed.js create
//   node scripts/demoSeed.js cleanup

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const Barbershop = require('../src/models/Barbershop');
const Service = require('../src/models/Service');
const Product = require('../src/models/Product');
const Appointment = require('../src/models/Appointment');
const Sale = require('../src/models/Sale');
const Expense = require('../src/models/Expense');
const PayrollEntry = require('../src/models/PayrollEntry');
const InventoryMovement = require('../src/models/InventoryMovement');
const Review = require('../src/models/Review');
const PortfolioPhoto = require('../src/models/PortfolioPhoto');
const { calculateGross } = require('../src/services/payrollService');

const DEMO_SLUG = 'demo-revision-cortio';
const DEMO_EMAIL_DOMAIN = '@demo.cortio.test';
const PASSWORD = 'DemoCortio2026!';

const HIST_DAYS = 35;
const FUTURE_DAYS = 3;

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function atTime(date, hh, mm) {
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function weighted(pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [value, w] of pairs) {
    if (r < w) return value;
    r -= w;
  }
  return pairs[0][0];
}
function money(n) {
  return Math.round(n).toLocaleString('es-CO');
}

async function connect() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'barbermax' });
}

async function cleanup({ verbose = true } = {}) {
  const barbershop = await Barbershop.findOne({ slug: DEMO_SLUG });
  const counts = {};

  if (barbershop) {
    const id = barbershop._id;
    counts.appointments = (await Appointment.deleteMany({ barbershop: id })).deletedCount;
    counts.sales = (await Sale.deleteMany({ barbershop: id })).deletedCount;
    counts.expenses = (await Expense.deleteMany({ barbershop: id })).deletedCount;
    counts.payrollEntries = (await PayrollEntry.deleteMany({ barbershop: id })).deletedCount;
    counts.inventoryMovements = (await InventoryMovement.deleteMany({ barbershop: id })).deletedCount;
    counts.reviews = (await Review.deleteMany({ barbershop: id })).deletedCount;
    counts.portfolioPhotos = (await PortfolioPhoto.deleteMany({ barbershop: id })).deletedCount;
    counts.products = (await Product.deleteMany({ barbershop: id })).deletedCount;
    counts.services = (await Service.deleteMany({ barbershop: id })).deletedCount;
    counts.staffUsers = (await User.deleteMany({ barbershop: id })).deletedCount;
    counts.barbershop = (await Barbershop.deleteOne({ _id: id })).deletedCount;
  } else {
    counts.appointments = counts.sales = counts.expenses = counts.payrollEntries = 0;
    counts.inventoryMovements = counts.reviews = counts.portfolioPhotos = 0;
    counts.products = counts.services = counts.staffUsers = counts.barbershop = 0;
  }

  // Demo customers have no `barbershop` field (customers are global), so they're
  // only identifiable by the tagged email domain.
  counts.customerUsers = (await User.deleteMany({ email: { $regex: `${DEMO_EMAIL_DOMAIN}$` } })).deletedCount;

  if (verbose) {
    console.log('Cleanup complete. Documents removed:');
    console.table(counts);
  }
  return counts;
}

async function create() {
  const existing = await Barbershop.findOne({ slug: DEMO_SLUG });
  if (existing) {
    console.log('A demo barbershop already exists — cleaning it up first.');
    await cleanup({ verbose: false });
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // --- Barbershop + owner ---
  const owner = await User.create({
    name: 'Sofía Restrepo',
    email: `owner${DEMO_EMAIL_DOMAIN}`,
    passwordHash,
    role: 'owner',
    phone: '300 900 1111',
  });

  const barbershop = await Barbershop.create({
    name: 'Barbería Central Demo',
    owner: owner._id,
    slug: DEMO_SLUG,
    address: 'Cra 50 # 10-20, Medellín',
    phone: '300 900 1111',
    businessHours: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '15:00' },
      { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', closed: true },
    ],
  });
  owner.barbershop = barbershop._id;
  await owner.save();

  // --- Barbers (one of each payment scheme) ---
  const julian = await User.create({
    name: 'Julián Cárdenas',
    email: `julian${DEMO_EMAIL_DOMAIN}`,
    passwordHash,
    role: 'barber',
    phone: '300 900 2222',
    barbershop: barbershop._id,
    paymentScheme: 'commission',
    commissionRate: 45,
    schedule: [1, 2, 3, 4, 5, 6].map((d) => ({
      dayOfWeek: d,
      startTime: '09:00',
      endTime: d === 6 ? '15:00' : '18:00',
    })),
  });

  const andres = await User.create({
    name: 'Andrés Molina',
    email: `andres${DEMO_EMAIL_DOMAIN}`,
    passwordHash,
    role: 'barber',
    phone: '300 900 3333',
    barbershop: barbershop._id,
    paymentScheme: 'mixed',
    commissionRate: 20,
    baseSalary: 450000,
    schedule: [2, 3, 4, 5, 6].map((d) => ({
      dayOfWeek: d,
      startTime: '10:00',
      endTime: d === 6 ? '15:00' : '19:00',
    })),
  });

  const kevin = await User.create({
    name: 'Kevin Duarte',
    email: `kevin${DEMO_EMAIL_DOMAIN}`,
    passwordHash,
    role: 'barber',
    phone: '300 900 4444',
    barbershop: barbershop._id,
    paymentScheme: 'fixed',
    baseSalary: 900000,
    schedule: [1, 3, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00' })),
  });

  const barbers = [julian, andres, kevin];

  // --- Services ---
  const services = await Service.insertMany([
    { barbershop: barbershop._id, name: 'Corte clásico', durationMinutes: 30, price: 25000, category: 'Corte' },
    { barbershop: barbershop._id, name: 'Barba + corte', durationMinutes: 45, price: 38000, category: 'Combo' },
    { barbershop: barbershop._id, name: 'Diseño de barba', durationMinutes: 30, price: 20000, category: 'Barba' },
    { barbershop: barbershop._id, name: 'Corte + tinte', durationMinutes: 60, price: 55000, category: 'Color' },
    { barbershop: barbershop._id, name: 'Afeitado clásico', durationMinutes: 25, price: 18000, category: 'Barba' },
  ]);

  // --- Products (in-memory stock tracking so sale generation can decrement it) ---
  const productDefs = [
    { name: 'Cera para cabello', sku: 'CERA-01', stockQuantity: 20, unitCost: 8000, salePrice: 15000 },
    { name: 'Shampoo anticaspa', sku: 'SHMP-02', stockQuantity: 15, unitCost: 12000, salePrice: 22000 },
    { name: 'Cuchillas de afeitar', sku: 'CUCH-03', stockQuantity: 50, unitCost: 1500, salePrice: 3000 },
    { name: 'Gel fijador', sku: 'GEL-04', stockQuantity: 18, unitCost: 6000, salePrice: 13000 },
    { name: 'Aceite para barba', sku: 'ACE-05', stockQuantity: 12, unitCost: 9000, salePrice: 19000 },
  ];
  const initialStock = new Map(productDefs.map((p) => [p.sku, p.stockQuantity]));
  const products = await Product.insertMany(
    productDefs.map((p) => ({ ...p, barbershop: barbershop._id, lowStockThreshold: 5 }))
  );
  const stockLevel = new Map(products.map((p) => [p.sku, p.stockQuantity]));

  // --- Customers ---
  const customerDefs = [
    { name: 'Ana Gómez', phone: '300 111 2222' },
    { name: 'Luis Rojas', phone: '300 222 3333' },
    { name: 'Camila Ruiz', phone: '300 333 4444' },
    { name: 'Diego Salazar', phone: '300 444 5555' },
    { name: 'Mateo Vargas', phone: '300 555 6666' },
    { name: 'Valentina Ríos', phone: '300 666 7777' },
    { name: 'Santiago Pérez', phone: '300 777 8888' },
    { name: 'Isabella Marín', phone: '300 888 9999' },
    { name: 'Jorge Londoño', phone: '300 999 0000' },
    { name: 'Daniela Ospina', phone: '300 000 1111' },
  ];
  const customers = [];
  for (const c of customerDefs) {
    const slug = c.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.');
    customers.push(await User.create({ ...c, email: `${slug}${DEMO_EMAIL_DOMAIN}`, passwordHash, role: 'customer' }));
  }
  // A few "regulars" get picked far more often than the rest, like a real shop.
  const regulars = customers.slice(0, 4);
  const occasional = customers.slice(4);

  function pickCustomer() {
    return Math.random() < 0.65 ? pick(regulars) : pick(occasional);
  }

  // --- Appointments across HIST_DAYS in the past through FUTURE_DAYS ahead ---
  const appointments = [];
  for (let offset = HIST_DAYS; offset >= -FUTURE_DAYS; offset--) {
    const date = daysAgo(offset);
    const dow = date.getDay();
    if (dow === 0) continue; // closed Sundays

    for (const barber of barbers) {
      const daySchedule = barber.schedule.find((s) => s.dayOfWeek === dow);
      if (!daySchedule) continue;

      const [sh, sm] = daySchedule.startTime.split(':').map(Number);
      const [eh, em] = daySchedule.endTime.split(':').map(Number);
      let cursorMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;

      const apptCount = weighted([[2, 2], [3, 4], [4, 4], [5, 2], [6, 1]]);
      for (let i = 0; i < apptCount; i++) {
        const service = pick(services);
        if (cursorMinutes + service.durationMinutes > endMinutes) break;

        // Small random gaps between bookings so the calendar doesn't look robotic.
        cursorMinutes += weighted([[0, 3], [15, 4], [30, 3]]);
        if (cursorMinutes + service.durationMinutes > endMinutes) break;

        const start = atTime(date, Math.floor(cursorMinutes / 60), cursorMinutes % 60);
        const end = addMinutes(start, service.durationMinutes);
        cursorMinutes += service.durationMinutes;

        let status;
        if (offset > 0) {
          status = weighted([['completed', 82], ['cancelled', 10], ['no_show', 8]]);
        } else if (offset === 0) {
          status = weighted([['completed', 60], ['confirmed', 30], ['pending', 10]]);
        } else {
          status = weighted([['confirmed', 70], ['pending', 30]]);
        }

        appointments.push({
          barbershop: barbershop._id,
          barber: barber._id,
          customer: pickCustomer()._id,
          service: service._id,
          startTime: start,
          endTime: end,
          status,
          priceAtBooking: service.price,
        });
      }
    }
  }

  const createdAppointments = await Appointment.insertMany(appointments);

  // --- Sales: one per completed appointment (selling the service is what marks it
  // completed in the real flow, but here appointments are already tagged so we just
  // mirror that with a matching Sale), plus a handful of walk-ins.
  const paymentMethods = [['cash', 45], ['card', 40], ['transfer', 15]];
  const inventoryMovements = [];
  const salesToInsert = [];

  function maybeAddProduct(items) {
    if (Math.random() >= 0.3) return;
    const product = pick(products);
    const have = stockLevel.get(product.sku);
    if (have < 1) return;
    stockLevel.set(product.sku, have - 1);
    items.push({
      itemType: 'Product',
      item: product._id,
      name: product.name,
      quantity: 1,
      unitPrice: product.salePrice,
      subtotal: product.salePrice,
    });
    inventoryMovements.push({
      barbershop: barbershop._id,
      product: product._id,
      type: 'out',
      quantity: 1,
      reason: 'sale',
      createdBy: owner._id,
    });
  }

  for (const appt of createdAppointments) {
    if (appt.status !== 'completed') continue;
    const service = services.find((s) => s._id.equals(appt.service));
    const items = [
      {
        itemType: 'Service',
        item: service._id,
        name: service.name,
        quantity: 1,
        unitPrice: service.price,
        subtotal: service.price,
      },
    ];
    maybeAddProduct(items);
    const total = items.reduce((s, i) => s + i.subtotal, 0);

    salesToInsert.push({
      barbershop: barbershop._id,
      barber: appt.barber,
      customer: appt.customer,
      appointment: appt._id,
      source: 'appointment',
      items,
      total,
      paymentMethod: weighted(paymentMethods),
      createdBy: appt.barber,
      createdAt: appt.endTime,
    });
  }

  // Walk-in sales (no appointment) spread through the history window.
  for (let i = 0; i < 14; i++) {
    const offset = Math.floor(Math.random() * HIST_DAYS);
    const date = daysAgo(offset);
    if (date.getDay() === 0) continue;
    const barber = pick(barbers);
    const items = [];
    maybeAddProduct(items);
    if (items.length === 0) {
      const product = pick(products);
      const have = stockLevel.get(product.sku);
      if (have < 1) continue;
      stockLevel.set(product.sku, have - 1);
      items.push({
        itemType: 'Product',
        item: product._id,
        name: product.name,
        quantity: 1,
        unitPrice: product.salePrice,
        subtotal: product.salePrice,
      });
      inventoryMovements.push({
        barbershop: barbershop._id,
        product: product._id,
        type: 'out',
        quantity: 1,
        reason: 'sale',
        createdBy: owner._id,
      });
    }
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    salesToInsert.push({
      barbershop: barbershop._id,
      barber: barber._id,
      customer: Math.random() < 0.5 ? pickCustomer()._id : undefined,
      source: 'walk_in',
      items,
      total,
      paymentMethod: weighted(paymentMethods),
      createdBy: owner._id,
      createdAt: atTime(date, 10 + Math.floor(Math.random() * 8), pick([0, 15, 30, 45])),
    });
  }

  const createdSales = await Sale.insertMany(salesToInsert);

  // Apply stock deltas + initial "in" restock movements for traceability.
  for (const product of products) {
    const finalStock = stockLevel.get(product.sku);
    await Product.updateOne({ _id: product._id }, { $set: { stockQuantity: finalStock } });
    inventoryMovements.unshift({
      barbershop: barbershop._id,
      product: product._id,
      type: 'in',
      quantity: initialStock.get(product.sku),
      reason: 'Inventario inicial',
      createdBy: owner._id,
    });
  }
  await InventoryMovement.insertMany(inventoryMovements);

  // --- Expenses across the history window ---
  await Expense.insertMany([
    { barbershop: barbershop._id, category: 'Arriendo', description: 'Arriendo local', amount: 900000, date: daysAgo(35), createdBy: owner._id },
    { barbershop: barbershop._id, category: 'Servicios públicos', description: 'Energía y agua', amount: 220000, date: daysAgo(28), createdBy: owner._id },
    { barbershop: barbershop._id, category: 'Insumos', description: 'Toallas y desinfectante', amount: 110000, date: daysAgo(20), createdBy: owner._id },
    { barbershop: barbershop._id, category: 'Marketing', description: 'Pauta en redes sociales', amount: 150000, date: daysAgo(14), createdBy: owner._id },
    { barbershop: barbershop._id, category: 'Mantenimiento', description: 'Mantenimiento de máquinas', amount: 80000, date: daysAgo(7), createdBy: owner._id },
    { barbershop: barbershop._id, category: 'Varios', description: 'Papelería y aseo', amount: 45000, date: daysAgo(2), createdBy: owner._id },
  ]);

  // --- Payroll: one closed, paid period per barber (days -35 to -5) ---
  const periodStart = daysAgo(35);
  const periodEnd = daysAgo(5);
  const payrollEntries = [];
  for (const barber of barbers) {
    const { grossAmount, saleIds } = await calculateGross(barber, periodStart, periodEnd);
    const lines = [];
    let netAmount = grossAmount;
    if (barber._id.equals(julian._id)) {
      lines.push({ type: 'bonus', label: 'Bono por desempeño', amount: 30000 });
      netAmount += 30000;
    }
    if (barber._id.equals(andres._id)) {
      lines.push({ type: 'deduction', label: 'Adelanto de nómina', amount: 40000 });
      netAmount -= 40000;
    }
    payrollEntries.push({
      barbershop: barbershop._id,
      barber: barber._id,
      periodStart,
      periodEnd,
      grossAmount,
      lines,
      netAmount: Math.max(netAmount, 0),
      sales: saleIds,
      status: 'paid',
      paymentMethod: 'transfer',
      paidAt: periodEnd,
    });
  }
  await PayrollEntry.insertMany(payrollEntries);

  // --- Reviews on a subset of completed appointments ---
  const completed = createdAppointments.filter((a) => a.status === 'completed');
  const reviewComments = [
    'Excelente atención, muy puntual.',
    'Me encantó el corte, volveré pronto.',
    'Buen servicio pero tuve que esperar un poco.',
    'El mejor barbero de la zona, 100% recomendado.',
    'Todo bien, ambiente agradable.',
    'Muy profesional, quedé satisfecho.',
  ];
  const reviewsToInsert = [];
  for (const appt of completed) {
    if (Math.random() >= 0.35) continue;
    reviewsToInsert.push({
      appointment: appt._id,
      barbershop: barbershop._id,
      customer: appt.customer,
      barber: appt.barber,
      rating: weighted([[5, 45], [4, 35], [3, 15], [2, 4], [1, 1]]),
      comment: pick(reviewComments),
    });
  }
  await Review.insertMany(reviewsToInsert);

  // --- Portfolio photos (placeholder images, purely for UI review) ---
  await PortfolioPhoto.insertMany([
    { barbershop: barbershop._id, barber: julian._id, service: services[1]._id, imageUrl: 'https://picsum.photos/seed/cortio-demo-1/600/800', description: 'Barba + corte degradado' },
    { barbershop: barbershop._id, barber: julian._id, service: services[0]._id, imageUrl: 'https://picsum.photos/seed/cortio-demo-2/600/800', description: 'Corte clásico' },
    { barbershop: barbershop._id, barber: andres._id, service: services[3]._id, imageUrl: 'https://picsum.photos/seed/cortio-demo-3/600/800', description: 'Corte + tinte' },
    { barbershop: barbershop._id, barber: andres._id, service: services[2]._id, imageUrl: 'https://picsum.photos/seed/cortio-demo-4/600/800', description: 'Diseño de barba' },
  ]);

  // --- Summary for the caller ---
  const totalIncome = createdSales.reduce((s, sale) => s + sale.total, 0);
  const totalExpenses = 900000 + 220000 + 110000 + 150000 + 80000 + 45000;

  return {
    barbershop,
    owner,
    barbers,
    customers,
    services,
    products,
    counts: {
      appointments: createdAppointments.length,
      completedAppointments: completed.length,
      cancelledAppointments: createdAppointments.filter((a) => a.status === 'cancelled').length,
      noShowAppointments: createdAppointments.filter((a) => a.status === 'no_show').length,
      upcomingAppointments: createdAppointments.filter((a) => ['pending', 'confirmed'].includes(a.status) && a.startTime > new Date()).length,
      sales: createdSales.length,
      expenses: 6,
      payrollEntries: payrollEntries.length,
      reviews: reviewsToInsert.length,
      portfolioPhotos: 4,
      inventoryMovements: inventoryMovements.length,
    },
    money: { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses },
    password: PASSWORD,
    historyRange: { from: periodStart.toISOString().slice(0, 10), to: daysAgo(-FUTURE_DAYS).toISOString().slice(0, 10) },
  };
}

async function main() {
  const cmd = process.argv[2];
  if (!['create', 'cleanup'].includes(cmd)) {
    console.error('Usage: node scripts/demoSeed.js <create|cleanup>');
    process.exit(1);
  }

  await connect();

  if (cmd === 'create') {
    const result = await create();
    console.log(JSON.stringify(result, null, 2));
  } else {
    await cleanup();
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
