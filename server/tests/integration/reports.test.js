import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { connectTestDb, disconnectTestDb } from '../setupDb.js';

// Loaded via require() so they share Node's module cache with app.js's own requires,
// same pattern billing.test.js already uses for direct-model test setup.
const mongoose = require('mongoose');
const Sale = require('../../src/models/Sale.js');
const Expense = require('../../src/models/Expense.js');
const PayrollEntry = require('../../src/models/PayrollEntry.js');
const Appointment = require('../../src/models/Appointment.js');
const Review = require('../../src/models/Review.js');

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function registerBarbershop(overrides = {}) {
  const res = await request(app).post('/api/auth/register-barbershop').send({
    ownerName: 'Dueño Reportes',
    email: `reportes-${Date.now()}-${Math.random()}@example.com`,
    password: 'ownerPass123',
    confirmPassword: 'ownerPass123',
    barbershopName: 'Barbería Reportes',
    slug: `barberia-reportes-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    identificationType: 'CC',
    identificationNumber: String(Math.floor(Math.random() * 1e10)),
    ...overrides
  });
  return { token: res.body.token, barbershop: res.body.barbershop, ownerId: res.body.user._id };
}

function fakeSaleItem(total) {
  return {
    itemType: 'Service',
    item: new mongoose.Types.ObjectId(),
    name: 'Corte clásico',
    quantity: 1,
    unitPrice: total,
    subtotal: total
  };
}

describe('reports: getSummary previous-period comparison', () => {
  let token;
  let barbershopId;
  let ownerId;

  beforeAll(async () => {
    await connectTestDb();
    const setup = await registerBarbershop();
    token = setup.token;
    barbershopId = setup.barbershop._id;
    ownerId = setup.ownerId;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('computes an exact percentage delta from real sale totals in both periods', async () => {
    // current: day 60-67, previous (auto-computed, equal length): day 53-59.
    await Sale.create({
      barbershop: barbershopId,
      items: [fakeSaleItem(300000)],
      total: 300000,
      paymentMethod: 'cash',
      createdBy: ownerId,
      createdAt: daysFromNow(62)
    });
    await Sale.create({
      barbershop: barbershopId,
      items: [fakeSaleItem(200000)],
      total: 200000,
      paymentMethod: 'cash',
      createdBy: ownerId,
      createdAt: daysFromNow(55)
    });

    const res = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: daysFromNow(60).toISOString(), to: daysFromNow(67).toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(300000);
    expect(res.body.previous.totalIncome).toBe(200000);
    expect(res.body.deltas.totalIncome).toBe(50);
  });

  it('returns previous: null and deltas: null when the shop is newer than the computed previous period', async () => {
    // The barbershop was created "now" (real time) in beforeAll — a current period that
    // starts before that instant means the would-be previous period is entirely before
    // the shop existed, so it must clamp away to nothing rather than a tiny sliver.
    const res = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: daysFromNow(-5).toISOString(), to: daysFromNow(2).toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.previous).toBeNull();
    expect(res.body.deltas).toBeNull();
  });

  it('returns a null delta when the previous period totals zero but the current period does not', async () => {
    await Sale.create({
      barbershop: barbershopId,
      items: [fakeSaleItem(100000)],
      total: 100000,
      paymentMethod: 'cash',
      createdBy: ownerId,
      createdAt: daysFromNow(82)
    });

    const res = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: daysFromNow(80).toISOString(), to: daysFromNow(87).toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.previous.totalIncome).toBe(0);
    expect(res.body.deltas.totalIncome).toBeNull();
  });

  it('returns a delta of exactly 0 when both periods total zero', async () => {
    const res = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: daysFromNow(100).toISOString(), to: daysFromNow(107).toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(0);
    expect(res.body.previous.totalIncome).toBe(0);
    expect(res.body.deltas.totalIncome).toBe(0);
  });

  it("returns a null netProfit delta when the previous period's net profit was negative", async () => {
    await Expense.create({
      barbershop: barbershopId,
      category: 'Renta',
      amount: 500000,
      date: daysFromNow(115),
      createdBy: ownerId
    });

    const res = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: daysFromNow(120).toISOString(), to: daysFromNow(127).toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.previous.netProfit).toBeLessThan(0);
    expect(res.body.deltas.netProfit).toBeNull();
  });
});

describe('reports: getCancellations', () => {
  let token;
  let barbershopId;
  let barberAId;
  let barberBId;
  let customerId;
  let serviceId;

  beforeAll(async () => {
    await connectTestDb();
    const setup = await registerBarbershop();
    token = setup.token;
    barbershopId = setup.barbershop._id;

    const barberARes = await request(app)
      .post('/api/auth/register-barber')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Barbero A', email: 'barbero-a-cancel@example.com', password: 'barberPass123', paymentScheme: 'fixed', baseSalary: 0 });
    barberAId = barberARes.body._id;

    const barberBRes = await request(app)
      .post('/api/auth/register-barber')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Barbero B', email: 'barbero-b-cancel@example.com', password: 'barberPass123', paymentScheme: 'fixed', baseSalary: 0 });
    barberBId = barberBRes.body._id;

    const customerRes = await request(app).post('/api/auth/register-customer').send({
      name: 'Cliente Cancelaciones',
      email: 'cliente-cancelaciones@example.com',
      password: 'customerPass123'
    });
    customerId = customerRes.body.user._id;

    const serviceRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Corte', category: 'Cortes', durationMinutes: 30, price: 20000 });
    serviceId = serviceRes.body._id;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  function makeAppointment({ barber, status, cancelledBy, startTime }) {
    return Appointment.create({
      barbershop: barbershopId,
      barber,
      customer: customerId,
      service: serviceId,
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60000),
      status,
      cancelledBy,
      priceAtBooking: 20000
    });
  }

  it('excludes pending/confirmed appointments from the resolved denominator, and rates only cover resolved ones', async () => {
    const from = daysFromNow(10);
    const to = daysFromNow(17);

    await makeAppointment({ barber: barberAId, status: 'completed', startTime: daysFromNow(11) });
    await makeAppointment({ barber: barberAId, status: 'cancelled', cancelledBy: 'customer', startTime: daysFromNow(12) });
    await makeAppointment({ barber: barberAId, status: 'pending', startTime: daysFromNow(13) });
    await makeAppointment({ barber: barberAId, status: 'confirmed', startTime: daysFromNow(14) });

    const res = await request(app)
      .get('/api/reports/cancellations')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.overall.resolvedCount).toBe(2);
    expect(res.body.overall.cancellationRate).toBe(50);
  });

  it('buckets cancelledByBreakdown correctly and never counts no_show in it', async () => {
    const from = daysFromNow(30);
    const to = daysFromNow(37);

    await makeAppointment({ barber: barberAId, status: 'cancelled', cancelledBy: 'owner', startTime: daysFromNow(31) });
    await makeAppointment({ barber: barberAId, status: 'cancelled', cancelledBy: 'barber', startTime: daysFromNow(32) });
    await makeAppointment({ barber: barberAId, status: 'cancelled', cancelledBy: 'customer', startTime: daysFromNow(33) });
    await makeAppointment({ barber: barberAId, status: 'no_show', startTime: daysFromNow(34) });

    const res = await request(app)
      .get('/api/reports/cancellations')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.overall.cancelledByBreakdown).toEqual({ owner: 1, barber: 1, customer: 1 });
    expect(res.body.overall.noShowCount).toBe(1);
  });

  it('scopes byBarber entries independently per professional', async () => {
    const from = daysFromNow(50);
    const to = daysFromNow(57);

    await makeAppointment({ barber: barberAId, status: 'completed', startTime: daysFromNow(51) });
    await makeAppointment({ barber: barberAId, status: 'completed', startTime: daysFromNow(52) });
    await makeAppointment({ barber: barberBId, status: 'cancelled', cancelledBy: 'customer', startTime: daysFromNow(53) });

    const res = await request(app)
      .get('/api/reports/cancellations')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString() });

    const a = res.body.byBarber.find((b) => b.barberId === barberAId);
    const b = res.body.byBarber.find((b2) => b2.barberId === barberBId);
    expect(a.resolvedCount).toBe(2);
    expect(a.cancellationRate).toBe(0);
    expect(b.resolvedCount).toBe(1);
    expect(b.cancellationRate).toBe(100);
  });

  it('excludes appointments whose startTime falls outside the requested range', async () => {
    const from = daysFromNow(70);
    const to = daysFromNow(77);

    await makeAppointment({ barber: barberAId, status: 'cancelled', cancelledBy: 'customer', startTime: daysFromNow(90) });

    const res = await request(app)
      .get('/api/reports/cancellations')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString() });

    expect(res.body.overall.resolvedCount).toBe(0);
  });

  it('returns null rates instead of NaN when there are zero resolved appointments', async () => {
    const res = await request(app)
      .get('/api/reports/cancellations')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: daysFromNow(200).toISOString(), to: daysFromNow(207).toISOString() });

    expect(res.body.overall.cancellationRate).toBeNull();
    expect(res.body.overall.noShowRate).toBeNull();
  });
});

describe('reports: getRatings', () => {
  let token;
  let barbershopId;
  let barberId;
  let customerId;
  let serviceId;

  beforeAll(async () => {
    await connectTestDb();
    const setup = await registerBarbershop();
    token = setup.token;
    barbershopId = setup.barbershop._id;

    const barberRes = await request(app)
      .post('/api/auth/register-barber')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Barbero Rating', email: 'barbero-rating@example.com', password: 'barberPass123', paymentScheme: 'fixed', baseSalary: 0 });
    barberId = barberRes.body._id;

    const customerRes = await request(app).post('/api/auth/register-customer').send({
      name: 'Cliente Ratings',
      email: 'cliente-ratings@example.com',
      password: 'customerPass123'
    });
    customerId = customerRes.body.user._id;

    const serviceRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Corte', category: 'Cortes', durationMinutes: 30, price: 20000 });
    serviceId = serviceRes.body._id;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function makeReviewedAppointment({ startTime, rating }) {
    const appt = await Appointment.create({
      barbershop: barbershopId,
      barber: barberId,
      customer: customerId,
      service: serviceId,
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60000),
      status: 'completed',
      priceAtBooking: 20000
    });
    await Review.create({ appointment: appt._id, barbershop: barbershopId, customer: customerId, barber: barberId, rating });
    return appt;
  }

  it("filters by the appointment's startTime, not the review's own createdAt", async () => {
    // The appointment happened inside the range; the review row itself is created "now"
    // (real time), which is outside the range — this is exactly the case the design
    // decision covers: it must still be counted, scoped by when the haircut happened.
    await makeReviewedAppointment({ startTime: daysFromNow(15), rating: 5 });

    const res = await request(app)
      .get('/api/reports/ratings')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: daysFromNow(10).toISOString(), to: daysFromNow(20).toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.overall.count).toBe(1);
    expect(res.body.overall.average).toBe(5);
  });

  it('computes average and distribution correctly across several ratings', async () => {
    const from = daysFromNow(40);
    const to = daysFromNow(47);
    await makeReviewedAppointment({ startTime: daysFromNow(41), rating: 4 });
    await makeReviewedAppointment({ startTime: daysFromNow(42), rating: 2 });

    const res = await request(app)
      .get('/api/reports/ratings')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString() });

    expect(res.body.overall.count).toBe(2);
    expect(res.body.overall.average).toBe(3);
    expect(res.body.overall.distribution).toEqual({ 1: 0, 2: 1, 3: 0, 4: 1, 5: 0 });
  });

  it('scopes byBarber entries and aggregates them into overall', async () => {
    const from = daysFromNow(60);
    const to = daysFromNow(67);
    await makeReviewedAppointment({ startTime: daysFromNow(61), rating: 5 });

    const res = await request(app)
      .get('/api/reports/ratings')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString() });

    const barberEntry = res.body.byBarber.find((b) => b.barberId === barberId);
    expect(barberEntry.count).toBe(1);
    expect(barberEntry.average).toBe(5);
  });

  it('returns count 0 and average null when there are no reviews in range', async () => {
    const res = await request(app)
      .get('/api/reports/ratings')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: daysFromNow(300).toISOString(), to: daysFromNow(307).toISOString() });

    expect(res.body.overall.count).toBe(0);
    expect(res.body.overall.average).toBeNull();
    expect(res.body.overall.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });
});

describe('reports: getSummary and getByService filtered by barberId', () => {
  let token;
  let barbershopId;
  let ownerId;
  let barberAId;
  let barberBId;
  let customerId;
  let serviceId;

  beforeAll(async () => {
    await connectTestDb();
    const setup = await registerBarbershop();
    token = setup.token;
    barbershopId = setup.barbershop._id;
    ownerId = setup.ownerId;

    const barberARes = await request(app)
      .post('/api/auth/register-barber')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Barbero A', email: 'barbero-a-filter@example.com', password: 'barberPass123', paymentScheme: 'fixed', baseSalary: 0 });
    barberAId = barberARes.body._id;

    const barberBRes = await request(app)
      .post('/api/auth/register-barber')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Barbero B', email: 'barbero-b-filter@example.com', password: 'barberPass123', paymentScheme: 'fixed', baseSalary: 0 });
    barberBId = barberBRes.body._id;

    const customerRes = await request(app).post('/api/auth/register-customer').send({
      name: 'Cliente Filtro',
      email: 'cliente-filtro@example.com',
      password: 'customerPass123'
    });
    customerId = customerRes.body.user._id;

    const serviceRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Corte', category: 'Cortes', durationMinutes: 30, price: 20000 });
    serviceId = serviceRes.body._id;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('scopes income and payroll to the selected professional, but leaves Gastos unfiltered', async () => {
    const from = daysFromNow(10);
    const to = daysFromNow(17);

    await Sale.create({
      barbershop: barbershopId,
      barber: barberAId,
      items: [fakeSaleItem(100000)],
      total: 100000,
      paymentMethod: 'cash',
      createdBy: ownerId,
      createdAt: daysFromNow(11)
    });
    await Sale.create({
      barbershop: barbershopId,
      barber: barberBId,
      items: [fakeSaleItem(50000)],
      total: 50000,
      paymentMethod: 'cash',
      createdBy: ownerId,
      createdAt: daysFromNow(12)
    });
    await Expense.create({ barbershop: barbershopId, category: 'Renta', amount: 20000, date: daysFromNow(11), createdBy: ownerId });
    await PayrollEntry.create({
      barbershop: barbershopId,
      barber: barberAId,
      periodStart: daysFromNow(1),
      periodEnd: daysFromNow(15),
      grossAmount: 30000,
      netAmount: 30000,
      status: 'paid',
      paidAt: daysFromNow(12)
    });

    const resA = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString(), barberId: barberAId });
    expect(resA.body.totalIncome).toBe(100000);
    expect(resA.body.totalPayroll).toBe(30000);
    expect(resA.body.totalExpenses).toBe(20000);

    const resB = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString(), barberId: barberBId });
    expect(resB.body.totalIncome).toBe(50000);
    expect(resB.body.totalPayroll).toBe(0);
    // Same shop-wide expense total regardless of which professional is selected —
    // expenses aren't attributable to one barber.
    expect(resB.body.totalExpenses).toBe(20000);

    const resAll = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString() });
    expect(resAll.body.totalIncome).toBe(150000);
  });

  it('scopes byService counts to the selected professional', async () => {
    const from = daysFromNow(30);
    const to = daysFromNow(37);

    await Appointment.create({
      barbershop: barbershopId,
      barber: barberAId,
      customer: customerId,
      service: serviceId,
      startTime: daysFromNow(31),
      endTime: new Date(daysFromNow(31).getTime() + 30 * 60000),
      status: 'completed',
      priceAtBooking: 20000
    });
    await Appointment.create({
      barbershop: barbershopId,
      barber: barberBId,
      customer: customerId,
      service: serviceId,
      startTime: daysFromNow(32),
      endTime: new Date(daysFromNow(32).getTime() + 30 * 60000),
      status: 'completed',
      priceAtBooking: 20000
    });

    const res = await request(app)
      .get('/api/reports/by-service')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString(), barberId: barberAId });

    expect(res.body.length).toBe(1);
    expect(res.body[0].count).toBe(1);
  });
});

describe('reports: getRecentReviews', () => {
  let token;
  let barbershopId;
  let barberId;
  let customerId;
  let serviceId;

  beforeAll(async () => {
    await connectTestDb();
    const setup = await registerBarbershop();
    token = setup.token;
    barbershopId = setup.barbershop._id;

    const barberRes = await request(app)
      .post('/api/auth/register-barber')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Barbero Reseñas', email: 'barbero-resenas@example.com', password: 'barberPass123', paymentScheme: 'fixed', baseSalary: 0 });
    barberId = barberRes.body._id;

    const customerRes = await request(app).post('/api/auth/register-customer').send({
      name: 'Cliente Reseñas',
      email: 'cliente-resenas@example.com',
      password: 'customerPass123'
    });
    customerId = customerRes.body.user._id;

    const serviceRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Corte', category: 'Cortes', durationMinutes: 30, price: 20000 });
    serviceId = serviceRes.body._id;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function makeReviewedAppointment({ startTime, rating, comment }) {
    const appt = await Appointment.create({
      barbershop: barbershopId,
      barber: barberId,
      customer: customerId,
      service: serviceId,
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60000),
      status: 'completed',
      priceAtBooking: 20000
    });
    await Review.create({ appointment: appt._id, barbershop: barbershopId, customer: customerId, barber: barberId, rating, comment });
  }

  it('returns reviews within range with barber/customer names', async () => {
    const from = daysFromNow(50);
    const to = daysFromNow(57);
    await makeReviewedAppointment({ startTime: daysFromNow(51), rating: 5, comment: 'Excelente corte' });
    await makeReviewedAppointment({ startTime: daysFromNow(52), rating: 3, comment: undefined });

    const res = await request(app)
      .get('/api/reports/recent-reviews')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.length).toBe(2);
    const withComment = res.body.items.find((r) => r.comment === 'Excelente corte');
    expect(withComment.barberName).toBe('Barbero Reseñas');
    expect(withComment.customerName).toBe('Cliente Reseñas');
    const withoutComment = res.body.items.find((r) => r.rating === 3);
    expect(withoutComment.comment).toBeNull();
  });

  it('excludes reviews whose appointment startTime falls outside the range', async () => {
    await makeReviewedAppointment({ startTime: daysFromNow(90), rating: 4, comment: 'Fuera de rango' });

    const res = await request(app)
      .get('/api/reports/recent-reviews')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: daysFromNow(70).toISOString(), to: daysFromNow(77).toISOString() });

    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('paginates results using page and pageSize, newest first', async () => {
    const from = daysFromNow(110);
    const to = daysFromNow(120);
    await makeReviewedAppointment({ startTime: daysFromNow(111), rating: 5, comment: 'Primero' });
    await makeReviewedAppointment({ startTime: daysFromNow(112), rating: 4, comment: 'Segundo' });
    await makeReviewedAppointment({ startTime: daysFromNow(113), rating: 3, comment: 'Tercero' });

    const page1 = await request(app)
      .get('/api/reports/recent-reviews')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString(), page: 1, pageSize: 2 });

    expect(page1.body.items.length).toBe(2);
    expect(page1.body.total).toBe(3);
    expect(page1.body.page).toBe(1);
    // Sorted by createdAt desc — these were created back-to-back just now, so the last
    // one made ("Tercero") is the most recent submission and should lead page 1.
    expect(page1.body.items[0].comment).toBe('Tercero');

    const page2 = await request(app)
      .get('/api/reports/recent-reviews')
      .set('Authorization', `Bearer ${token}`)
      .query({ from: from.toISOString(), to: to.toISOString(), page: 2, pageSize: 2 });

    expect(page2.body.items.length).toBe(1);
    expect(page2.body.items[0].comment).toBe('Primero');
  });
});
