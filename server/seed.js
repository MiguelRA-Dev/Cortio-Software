require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/User');
const Barbershop = require('./src/models/Barbershop');
const Service = require('./src/models/Service');
const Product = require('./src/models/Product');
const Appointment = require('./src/models/Appointment');
const Sale = require('./src/models/Sale');
const Expense = require('./src/models/Expense');
const PayrollEntry = require('./src/models/PayrollEntry');

const PASSWORD = 'password123';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function inDays(n) {
  return daysAgo(-n);
}

function atTime(date, hh, mm) {
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'barbermax' });
  await mongoose.connection.dropDatabase();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // --- Barbershop + owner ---
  const owner = await User.create({
    name: 'Carlos Owner',
    email: 'owner@cortio.test',
    passwordHash,
    role: 'owner',
    phone: '300 555 1234',
  });

  const barbershop = await Barbershop.create({
    name: 'Barbería El Corte',
    owner: owner._id,
    slug: 'el-corte',
    address: 'Cra 45 # 12-30, Medellín',
    phone: '300 555 1234',
    businessHours: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '15:00' },
    ],
  });
  owner.barbershop = barbershop._id;
  await owner.save();

  // --- Barbers ---
  const juan = await User.create({
    name: 'Juan Barbero',
    email: 'juan@cortio.test',
    passwordHash,
    role: 'barber',
    phone: '300 111 1111',
    barbershop: barbershop._id,
    paymentScheme: 'commission',
    commissionRate: 50,
    schedule: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '18:00' })),
  });

  const pedro = await User.create({
    name: 'Pedro Ríos',
    email: 'pedro@cortio.test',
    passwordHash,
    role: 'barber',
    phone: '300 222 2222',
    barbershop: barbershop._id,
    paymentScheme: 'mixed',
    commissionRate: 30,
    baseSalary: 500000,
    schedule: [
      { dayOfWeek: 2, startTime: '10:00', endTime: '19:00' },
      { dayOfWeek: 3, startTime: '10:00', endTime: '19:00' },
      { dayOfWeek: 4, startTime: '10:00', endTime: '19:00' },
      { dayOfWeek: 5, startTime: '10:00', endTime: '19:00' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '15:00' },
    ],
  });

  // --- Services ---
  const [corte, barbaCorte, disenoBarba, corteTinte] = await Service.insertMany([
    { barbershop: barbershop._id, name: 'Corte clásico', durationMinutes: 30, price: 25000, category: 'Corte' },
    { barbershop: barbershop._id, name: 'Barba + corte', durationMinutes: 45, price: 38000, category: 'Combo' },
    { barbershop: barbershop._id, name: 'Diseño de barba', durationMinutes: 30, price: 20000, category: 'Barba' },
    { barbershop: barbershop._id, name: 'Corte + tinte', durationMinutes: 60, price: 55000, category: 'Color' },
  ]);

  // --- Products ---
  const [cera] = await Product.insertMany([
    { barbershop: barbershop._id, name: 'Cera para cabello', sku: 'CERA-01', stockQuantity: 13, unitCost: 8000, salePrice: 15000, lowStockThreshold: 5 },
    { barbershop: barbershop._id, name: 'Shampoo anticaspa', sku: 'SHMP-02', stockQuantity: 2, unitCost: 12000, salePrice: 22000, lowStockThreshold: 5 },
    { barbershop: barbershop._id, name: 'Cuchillas de afeitar', sku: 'CUCH-03', stockQuantity: 40, unitCost: 1500, salePrice: 3000, lowStockThreshold: 10 },
    { barbershop: barbershop._id, name: 'Gel fijador', sku: 'GEL-04', stockQuantity: 0, unitCost: 6000, salePrice: 13000, lowStockThreshold: 3, active: false },
  ]);

  // --- Customers ---
  const customerDefs = [
    { name: 'Ana Gómez', email: 'ana.gomez@example.test', phone: '300 111 2222' },
    { name: 'Luis Rojas', email: 'luis.rojas@example.test', phone: '300 222 3333' },
    { name: 'Camila Ruiz', email: 'camila.ruiz@example.test', phone: '300 333 4444' },
    { name: 'Diego Salazar', email: 'diego.salazar@example.test', phone: '300 444 5555' },
    { name: 'Mateo Vargas', email: 'mateo.vargas@example.test', phone: '300 555 6666' },
    { name: 'Valentina Ríos', email: 'valentina.rios@example.test', phone: '300 666 7777' },
  ];
  const customers = {};
  for (const c of customerDefs) {
    customers[c.name] = await User.create({ ...c, passwordHash, role: 'customer' });
  }

  // --- Appointments ---
  function makeAppt({ customer, barber, service, when, hh, mm, status }) {
    const start = atTime(when, hh, mm);
    return {
      barbershop: barbershop._id,
      barber: barber._id,
      customer: customer._id,
      service: service._id,
      startTime: start,
      endTime: addMinutes(start, service.durationMinutes),
      status,
      priceAtBooking: service.price,
    };
  }

  const appointments = [
    // Ana Gómez — frequent, recent (visits today)
    makeAppt({ customer: customers['Ana Gómez'], barber: juan, service: corte, when: daysAgo(95), hh: 9, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Ana Gómez'], barber: juan, service: corte, when: daysAgo(60), hh: 9, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Ana Gómez'], barber: juan, service: barbaCorte, when: daysAgo(30), hh: 9, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Ana Gómez'], barber: juan, service: corte, when: daysAgo(14), hh: 9, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Ana Gómez'], barber: juan, service: corte, when: daysAgo(3), hh: 9, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Ana Gómez'], barber: juan, service: corte, when: new Date(), hh: 9, mm: 0, status: 'completed' }),

    // Luis Rojas — new customer
    makeAppt({ customer: customers['Luis Rojas'], barber: pedro, service: barbaCorte, when: daysAgo(15), hh: 10, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Luis Rojas'], barber: pedro, service: barbaCorte, when: daysAgo(8), hh: 10, mm: 0, status: 'cancelled' }),
    makeAppt({ customer: customers['Luis Rojas'], barber: pedro, service: barbaCorte, when: daysAgo(2), hh: 10, mm: 0, status: 'completed' }),

    // Camila Ruiz — frequent
    makeAppt({ customer: customers['Camila Ruiz'], barber: juan, service: corte, when: daysAgo(120), hh: 11, mm: 30, status: 'completed' }),
    makeAppt({ customer: customers['Camila Ruiz'], barber: juan, service: corte, when: daysAgo(80), hh: 11, mm: 30, status: 'completed' }),
    makeAppt({ customer: customers['Camila Ruiz'], barber: juan, service: corte, when: daysAgo(45), hh: 11, mm: 30, status: 'completed' }),
    makeAppt({ customer: customers['Camila Ruiz'], barber: juan, service: corte, when: daysAgo(20), hh: 11, mm: 30, status: 'completed' }),
    makeAppt({ customer: customers['Camila Ruiz'], barber: juan, service: corte, when: daysAgo(5), hh: 11, mm: 30, status: 'completed' }),
    makeAppt({ customer: customers['Camila Ruiz'], barber: juan, service: corte, when: new Date(), hh: 11, mm: 30, status: 'confirmed' }),
    makeAppt({ customer: customers['Camila Ruiz'], barber: juan, service: barbaCorte, when: inDays(3), hh: 14, mm: 0, status: 'pending' }),

    // Diego Salazar — inactive
    makeAppt({ customer: customers['Diego Salazar'], barber: pedro, service: disenoBarba, when: daysAgo(150), hh: 14, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Diego Salazar'], barber: pedro, service: disenoBarba, when: daysAgo(110), hh: 14, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Diego Salazar'], barber: pedro, service: disenoBarba, when: daysAgo(75), hh: 14, mm: 0, status: 'completed' }),

    // Mateo Vargas — new, single upcoming booking today
    makeAppt({ customer: customers['Mateo Vargas'], barber: juan, service: corteTinte, when: new Date(), hh: 16, mm: 30, status: 'pending' }),

    // Valentina Ríos — inactive despite historical volume
    makeAppt({ customer: customers['Valentina Ríos'], barber: juan, service: corte, when: daysAgo(300), hh: 12, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Valentina Ríos'], barber: juan, service: corte, when: daysAgo(260), hh: 12, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Valentina Ríos'], barber: juan, service: corte, when: daysAgo(220), hh: 12, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Valentina Ríos'], barber: juan, service: corte, when: daysAgo(190), hh: 12, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Valentina Ríos'], barber: juan, service: corte, when: daysAgo(150), hh: 12, mm: 0, status: 'completed' }),
    makeAppt({ customer: customers['Valentina Ríos'], barber: juan, service: corte, when: daysAgo(100), hh: 12, mm: 0, status: 'completed' }),

    // A couple more upcoming bookings so Agenda has near-future data too
    makeAppt({ customer: customers['Ana Gómez'], barber: juan, service: corte, when: inDays(2), hh: 10, mm: 0, status: 'confirmed' }),
    makeAppt({ customer: customers['Luis Rojas'], barber: pedro, service: barbaCorte, when: inDays(1), hh: 11, mm: 0, status: 'confirmed' }),
  ];

  const createdAppointments = await Appointment.insertMany(appointments);

  // --- Sales (POS) ---
  const completedToday = createdAppointments.find(
    (a) => a.status === 'completed' && a.startTime.toDateString() === new Date().toDateString()
  );

  await Sale.insertMany([
    {
      barbershop: barbershop._id,
      barber: juan._id,
      customer: customers['Ana Gómez']._id,
      appointment: completedToday?._id,
      items: [
        { itemType: 'Service', item: corte._id, name: corte.name, quantity: 1, unitPrice: corte.price, subtotal: corte.price },
        { itemType: 'Product', item: cera._id, name: cera.name, quantity: 1, unitPrice: cera.salePrice, subtotal: cera.salePrice },
      ],
      total: corte.price + cera.salePrice,
      paymentMethod: 'cash',
      createdBy: owner._id,
    },
    {
      barbershop: barbershop._id,
      barber: pedro._id,
      customer: customers['Luis Rojas']._id,
      items: [{ itemType: 'Service', item: barbaCorte._id, name: barbaCorte.name, quantity: 1, unitPrice: barbaCorte.price, subtotal: barbaCorte.price }],
      total: barbaCorte.price,
      paymentMethod: 'card',
      createdBy: owner._id,
    },
  ]);

  // --- Expenses (current month) ---
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  await Expense.insertMany([
    { barbershop: barbershop._id, category: 'Arriendo', description: 'Arriendo local', amount: 800000, date: monthStart, createdBy: owner._id },
    { barbershop: barbershop._id, category: 'Servicios públicos', description: 'Energía y agua', amount: 180000, date: daysAgo(25), createdBy: owner._id },
    { barbershop: barbershop._id, category: 'Insumos', description: 'Toallas y desinfectante', amount: 95000, date: daysAgo(15), createdBy: owner._id },
    { barbershop: barbershop._id, category: 'Marketing', description: 'Pauta en redes sociales', amount: 120000, date: daysAgo(10), createdBy: owner._id },
  ]);

  // --- Payroll (last month, paid) ---
  const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
  await PayrollEntry.create({
    barbershop: barbershop._id,
    barber: pedro._id,
    periodStart: lastMonthStart,
    periodEnd: lastMonthEnd,
    grossAmount: 794000,
    netAmount: 794000,
    status: 'paid',
    paidAt: lastMonthEnd,
  });

  console.log('Seed complete.');
  console.log('');
  console.log('Login credentials (password for all: ' + PASSWORD + '):');
  console.log('  Owner:  owner@cortio.test');
  console.log('  Barber: juan@cortio.test');
  console.log('  Barber: pedro@cortio.test');
  console.log('  Customer: ana.gomez@example.test (and 5 more, see customerDefs)');
  console.log('');
  console.log('Barbershop slug: el-corte  ->  /b/el-corte');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
