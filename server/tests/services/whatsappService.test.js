import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendTemplateMessage } from '../../src/services/whatsappService.js';

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
