import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectTestDb, disconnectTestDb } from '../setupDb.js';

// Loaded via require(), not import — these are also require()'d transitively by other
// modules (e.g. billingController requires Barbershop itself). Mixing that with a
// separate top-level `import` of the same file makes Vite resolve two independent module
// instances, and mongoose.model() throws "Cannot overwrite model" the second time it
// registers the same name. require() keeps everything on Node's single module cache.
const User = require('../../src/models/User.js');
const Barbershop = require('../../src/models/Barbershop.js');
const { applyPaymentResult } = require('../../src/controllers/billingController.js');

// applyPaymentResult is what the MercadoPago webhook calls once it resolves a payment —
// this session added the `:annual` external_reference suffix so one webhook handler can
// tell a monthly Checkout Pro payment apart from an annual one and extend the
// subscription by the right amount.
describe('billingController.applyPaymentResult', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function makeBarbershop(slug) {
    const owner = await User.create({ name: 'Dueño Test', passwordHash: 'x', role: 'owner' });
    return Barbershop.create({ name: 'Barbería Test', owner: owner._id, slug });
  }

  it('extends currentPeriodEnd by 1 month for an approved monthly payment', async () => {
    const barbershop = await makeBarbershop('billing-monthly');
    const before = Date.now();

    await applyPaymentResult({
      barbershop,
      payment: { status: 'approved', id: 'pay-1', payment_method_id: 'visa' },
      cycle: 'monthly',
    });

    expect(barbershop.subscriptionStatus).toBe('active');
    const daysExtended = (barbershop.currentPeriodEnd.getTime() - before) / (24 * 60 * 60 * 1000);
    // ~1 calendar month — allow a few days of slack for varying month lengths.
    expect(daysExtended).toBeGreaterThan(27);
    expect(daysExtended).toBeLessThan(32);
  });

  it('extends currentPeriodEnd by 365 days for an approved annual payment', async () => {
    const barbershop = await makeBarbershop('billing-annual');
    const before = Date.now();

    await applyPaymentResult({
      barbershop,
      payment: { status: 'approved', id: 'pay-2', payment_method_id: 'visa' },
      cycle: 'annual',
    });

    expect(barbershop.subscriptionStatus).toBe('active');
    const daysExtended = (barbershop.currentPeriodEnd.getTime() - before) / (24 * 60 * 60 * 1000);
    expect(daysExtended).toBeGreaterThan(364);
    expect(daysExtended).toBeLessThan(366);
  });

  it('does not double-extend when the same approved payment is applied twice (webhook redelivery)', async () => {
    const barbershop = await makeBarbershop('billing-idempotent');

    await applyPaymentResult({
      barbershop,
      payment: { status: 'approved', id: 'pay-3', payment_method_id: 'visa' },
      cycle: 'monthly',
    });
    const periodEndAfterFirst = barbershop.currentPeriodEnd.getTime();

    await applyPaymentResult({
      barbershop,
      payment: { status: 'approved', id: 'pay-3', payment_method_id: 'visa' },
      cycle: 'monthly',
    });

    expect(barbershop.currentPeriodEnd.getTime()).toBe(periodEndAfterFirst);
  });

  it('marks the subscription past_due on a rejected payment', async () => {
    const barbershop = await makeBarbershop('billing-rejected');

    await applyPaymentResult({
      barbershop,
      payment: { status: 'rejected', id: 'pay-4' },
      cycle: 'monthly',
    });

    expect(barbershop.subscriptionStatus).toBe('past_due');
  });
});
