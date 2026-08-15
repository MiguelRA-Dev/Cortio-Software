import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { connectTestDb, disconnectTestDb } from '../setupDb.js';
import { bogotaDateParts, bogotaDateKey, bogotaMidnightFromDateString } from '../../src/utils/bogotaTime.js';

// The single most important regression test in this suite: the production bug this
// session fixed was a barber's 9am-8pm schedule showing as 4am-2pm to customers, because
// availability was computed with server-local Date methods instead of the fixed Bogotá
// offset. This locks in that a 09:00-20:00 schedule returns slots between 09:00 and
// 19:xx Bogotá time, regardless of what timezone the test machine/CI runner is in.
describe('appointments: availability respects the barber\'s Bogotá business hours', () => {
  let ownerToken;
  let barbershopSlug;
  let barberId;
  let serviceId;

  // A date 14 days out, so `slotStartDate < now` (availabilityService's past-slot filter)
  // never excludes anything no matter when this suite runs.
  const futureInstant = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const dateStr = bogotaDateKey(futureInstant);
  const { dayOfWeek } = bogotaDateParts(bogotaMidnightFromDateString(dateStr));

  beforeAll(async () => {
    await connectTestDb();

    const ownerRes = await request(app).post('/api/auth/register-barbershop').send({
      ownerName: 'Carlos Dueño',
      email: 'carlos-availability@example.com',
      password: 'ownerPass123',
      confirmPassword: 'ownerPass123',
      barbershopName: 'Barbería Carlos',
      slug: 'barberia-carlos-availability',
      identificationType: 'CC',
      identificationNumber: '2000000001',
    });
    ownerToken = ownerRes.body.token;
    barbershopSlug = ownerRes.body.barbershop.slug;

    const barberRes = await request(app)
      .post('/api/auth/register-barber')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Miguel Profesional',
        email: 'miguel-availability@example.com',
        password: 'barberPass123',
        paymentScheme: 'fixed',
        baseSalary: 0,
        schedule: [{ dayOfWeek, startTime: '09:00', endTime: '20:00' }],
      });
    barberId = barberRes.body._id;

    const serviceRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Corte clásico', category: 'Cortes', durationMinutes: 60, price: 30000 });
    serviceId = serviceRes.body._id;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('returns slots, all falling within 09:00-19:xx Bogotá time', async () => {
    const res = await request(app).get(`/api/appointments/availability/${barbershopSlug}`).query({
      barberId,
      serviceId,
      date: dateStr,
    });

    expect(res.status).toBe(200);
    expect(res.body.slots.length).toBeGreaterThan(0);

    for (const iso of res.body.slots) {
      const instant = new Date(iso);
      // Same shift bogotaTime.js uses internally to read Bogotá local parts.
      const bogotaLocal = new Date(instant.getTime() - 5 * 60 * 60000);
      const hour = bogotaLocal.getUTCHours();
      // This is the exact regression check: a naive server-local read of a 9am-8pm
      // Bogotá schedule produced 4am-2pm instead — asserting the Bogotá-shifted hour
      // stays within [9, 20) is what would have caught that bug before it shipped.
      expect(hour).toBeGreaterThanOrEqual(9);
      expect(hour).toBeLessThan(20);
    }
  });

  it('returns an empty list for a day the barber has no schedule for', async () => {
    // The barber's schedule only has an entry for `dayOfWeek` — the calendar day right
    // after it always has a different weekday, so it never matches any schedule range.
    const nextDayInstant = new Date(futureInstant.getTime() + 24 * 60 * 60 * 1000);
    const nextDateStr = bogotaDateKey(nextDayInstant);

    const res = await request(app).get(`/api/appointments/availability/${barbershopSlug}`).query({
      barberId,
      serviceId,
      date: nextDateStr,
    });
    expect(res.status).toBe(200);
    expect(res.body.slots).toEqual([]);
  });
});

// Not every professional performs every service (e.g. one barber might not do color) —
// User.services is an optional allowlist enforced in resolveBookingContext, the single
// choke point both getAvailability and create funnel through.
describe('appointments: a barber restricted to specific services', () => {
  let customerToken;
  let barbershopSlug;
  let restrictedBarberId;
  let unrestrictedBarberId;
  let serviceAId;
  let serviceBId;

  const futureInstant = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const dateStr = bogotaDateKey(futureInstant);
  const { dayOfWeek } = bogotaDateParts(bogotaMidnightFromDateString(dateStr));

  beforeAll(async () => {
    await connectTestDb();

    const ownerRes = await request(app).post('/api/auth/register-barbershop').send({
      ownerName: 'Diana Dueña',
      email: 'diana-services@example.com',
      password: 'ownerPass123',
      confirmPassword: 'ownerPass123',
      barbershopName: 'Barbería Diana',
      slug: 'barberia-diana-services',
      identificationType: 'CC',
      identificationNumber: '2000000002',
    });
    const ownerToken = ownerRes.body.token;
    barbershopSlug = ownerRes.body.barbershop.slug;

    const schedule = [{ dayOfWeek, startTime: '09:00', endTime: '20:00' }];

    const restrictedRes = await request(app)
      .post('/api/auth/register-barber')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Solo Cortes',
        email: 'solo-cortes@example.com',
        password: 'barberPass123',
        paymentScheme: 'fixed',
        baseSalary: 0,
        schedule,
      });
    restrictedBarberId = restrictedRes.body._id;

    const unrestrictedRes = await request(app)
      .post('/api/auth/register-barber')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Hace De Todo',
        email: 'hace-de-todo@example.com',
        password: 'barberPass123',
        paymentScheme: 'fixed',
        baseSalary: 0,
        schedule,
      });
    unrestrictedBarberId = unrestrictedRes.body._id;

    const serviceARes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Corte clásico', category: 'Cortes', durationMinutes: 30, price: 20000 });
    serviceAId = serviceARes.body._id;

    const serviceBRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Tinte', category: 'Color', durationMinutes: 60, price: 50000 });
    serviceBId = serviceBRes.body._id;

    // Restrict "Solo Cortes" to service A only — "Hace De Todo" keeps the default empty
    // services array (unrestricted).
    await request(app)
      .patch(`/api/barbers/${restrictedBarberId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ services: [serviceAId] });

    const customerRes = await request(app).post('/api/auth/register-customer').send({
      name: 'Cliente Prueba',
      email: 'cliente-services@example.com',
      password: 'customerPass123',
    });
    customerToken = customerRes.body.token;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('rejects booking a service the restricted barber does not perform', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ slug: barbershopSlug, barberId: restrictedBarberId, serviceId: serviceBId, startTime: `${dateStr}T14:00:00.000Z` });

    expect(res.status).toBe(409);
  });

  it('allows booking a service the restricted barber does perform', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ slug: barbershopSlug, barberId: restrictedBarberId, serviceId: serviceAId, startTime: `${dateStr}T15:00:00.000Z` });

    expect(res.status).toBe(201);
  });

  it('allows booking any service with an unrestricted barber (empty services = backward compatible)', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ slug: barbershopSlug, barberId: unrestrictedBarberId, serviceId: serviceBId, startTime: `${dateStr}T16:00:00.000Z` });

    expect(res.status).toBe(201);
  });

  it('rejects the same mismatched combination on the availability endpoint too', async () => {
    const res = await request(app).get(`/api/appointments/availability/${barbershopSlug}`).query({
      barberId: restrictedBarberId,
      serviceId: serviceBId,
      date: dateStr,
    });

    expect(res.status).toBe(409);
  });
});
