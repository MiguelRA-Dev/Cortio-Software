import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { connectTestDb, disconnectTestDb } from '../setupDb.js';

// Regression coverage for this session's biggest auth change: the same email can now
// front an owner, a barber, AND a customer account at once (one barber becoming an
// independent owner shouldn't be blocked by their own customer/barber account), but each
// role is still unique on its own — and login has to resolve the right one via the
// bcrypt-compare loop in authController.login, not just the first match.
describe('auth: email reuse across roles + multi-account login', () => {
  const SHARED_EMAIL = 'multi-role@example.com';
  const OWNER_PASSWORD = 'ownerPass123';
  const CUSTOMER_PASSWORD = 'customerPass123';

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('registers a barbershop owner with a fresh email', async () => {
    const res = await request(app).post('/api/auth/register-barbershop').send({
      ownerName: 'Ana Dueña',
      email: SHARED_EMAIL,
      password: OWNER_PASSWORD,
      confirmPassword: OWNER_PASSWORD,
      barbershopName: 'Barbería de Ana',
      slug: 'barberia-de-ana',
      identificationType: 'CC',
      identificationNumber: '1000000001',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('owner');
    expect(res.body.token).toBeTruthy();
  });

  it('lets the SAME email register a customer account too', async () => {
    const res = await request(app).post('/api/auth/register-customer').send({
      name: 'Ana Cliente',
      email: SHARED_EMAIL,
      password: CUSTOMER_PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('customer');
  });

  it('still rejects a SECOND owner account with the same email (unique per role, not globally)', async () => {
    const res = await request(app).post('/api/auth/register-barbershop').send({
      ownerName: 'Otra Ana',
      email: SHARED_EMAIL,
      password: 'somethingElse123',
      confirmPassword: 'somethingElse123',
      barbershopName: 'Otra Barbería',
      slug: 'otra-barberia',
      identificationType: 'CC',
      identificationNumber: '1000000002',
    });

    expect(res.status).toBe(409);
  });

  it('login resolves the OWNER account when given the owner password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: SHARED_EMAIL,
      password: OWNER_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('owner');
  });

  it('login resolves the CUSTOMER account when given the customer password, same email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: SHARED_EMAIL,
      password: CUSTOMER_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('customer');
  });

  it('login rejects a wrong password for either account with a generic 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: SHARED_EMAIL,
      password: 'totally-wrong-password',
    });

    expect(res.status).toBe(401);
  });
});
