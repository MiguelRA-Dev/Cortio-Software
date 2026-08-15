import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendTemplateMessage,
  notifyAppointmentCreated,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  notifyAppointmentReminder
} from '../../src/services/whatsappService.js';

// sendTemplateMessage must NEVER throw — a bad phone number, a missing token, or Meta
// being down should log and return null, not break the appointment flow that triggered it.
describe('whatsappService.sendTemplateMessage', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  function stubFetch(implementation) {
    const fn = vi.fn(implementation);
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  it('formats a 10-digit local phone number by prefixing the Colombia country code', async () => {
    let capturedBody;
    stubFetch(async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ messages: [{ id: 'wamid.test' }] }) };
    });

    await sendTemplateMessage({ to: '3134167377', template: 'cita_nueva', components: [] });

    expect(capturedBody.to).toBe('573134167377');
  });

  it('leaves an already-complete number untouched', async () => {
    let capturedBody;
    stubFetch(async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({}) };
    });

    await sendTemplateMessage({ to: '573118205548', template: 'cita_nueva', components: [] });

    expect(capturedBody.to).toBe('573118205548');
  });

  it('sends the approved template language (es_CO) by default', async () => {
    let capturedBody;
    stubFetch(async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({}) };
    });

    await sendTemplateMessage({ to: '3134167377', template: 'cita_nueva', components: [] });

    expect(capturedBody.template.language.code).toBe('es_CO');
  });

  it('returns null without calling fetch when the phone number is missing', async () => {
    const fetchMock = stubFetch(async () => ({ ok: true, json: async () => ({}) }));

    const result = await sendTemplateMessage({ to: '', template: 'cita_nueva', components: [] });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null without calling fetch when WHATSAPP_ACCESS_TOKEN is missing', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const fetchMock = stubFetch(async () => ({ ok: true, json: async () => ({}) }));

    const result = await sendTemplateMessage({ to: '3134167377', template: 'cita_nueva', components: [] });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when Meta responds with a non-ok status (e.g. unapproved template)', async () => {
    stubFetch(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid parameter' } }),
    }));

    const result = await sendTemplateMessage({ to: '3134167377', template: 'cita_nueva', components: [] });

    expect(result).toBeNull();
  });

  it('returns null instead of throwing when fetch itself rejects (network/outage)', async () => {
    stubFetch(async () => {
      throw new Error('network down');
    });

    const result = await sendTemplateMessage({ to: '3134167377', template: 'cita_nueva', components: [] });

    expect(result).toBeNull();
  });
});

// EXPLICIT COST GATE: a free trial signup must never trigger a real WhatsApp send — Meta
// bills per business-initiated message, and Cortio (not the barbershop) eats that cost
// until the shop actually pays. Only subscriptionStatus === 'active' may send.
describe('whatsappService notify* functions gate on a paid (active) subscription', () => {
  const context = {
    barber: { phone: '3134167377' },
    customer: { name: 'Juan Pérez' },
    service: { name: 'Corte clásico' },
    startTime: new Date('2026-08-25T14:00:00.000Z'),
  };

  beforeEach(() => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch() {
    const fn = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  const NOTIFY_FNS = {
    notifyAppointmentCreated,
    notifyAppointmentCancelled,
    notifyAppointmentRescheduled,
    notifyAppointmentReminder,
  };

  for (const [name, fn] of Object.entries(NOTIFY_FNS)) {
    it(`${name}: never sends for a trialing/past_due/canceled shop`, async () => {
      const fetchMock = stubFetch();
      for (const subscriptionStatus of ['trialing', 'past_due', 'canceled', undefined]) {
        const result = await fn({ ...context, subscriptionStatus });
        expect(result).toBeNull();
      }
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it(`${name}: sends once the shop's subscription is active`, async () => {
      const fetchMock = stubFetch();
      await fn({ ...context, subscriptionStatus: 'active' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  }
});
