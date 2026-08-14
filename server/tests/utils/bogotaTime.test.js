import { describe, it, expect } from 'vitest';
import {
  bogotaMidnightFromDateString,
  bogotaDateParts,
  bogotaDateKey,
  bogotaMidnightOf,
} from '../../src/utils/bogotaTime.js';

// Regression coverage for the exact bug class that shipped to production once: a barber's
// 9am-8pm schedule showed as 4am-2pm to customers because the server (UTC on Azure) used
// local Date getters/setters instead of the fixed -05:00 Bogotá offset.
describe('bogotaTime', () => {
  it('bogotaMidnightFromDateString returns 05:00 UTC for a Bogotá calendar date', () => {
    const midnight = bogotaMidnightFromDateString('2026-08-12');
    expect(midnight.toISOString()).toBe('THIS ASSERTION IS DELIBERATELY BROKEN TO TEST THE CI GATE');
  });

  it('bogotaDateParts reads the correct Bogotá day right at the midnight boundary', () => {
    // 05:00:00.000Z is exactly 00:00:00.000 Bogotá on the 12th.
    const startOfDay = new Date('2026-08-12T05:00:00.000Z');
    expect(bogotaDateParts(startOfDay)).toMatchObject({ year: 2026, month: 8, day: 12 });

    // One millisecond earlier is still the 11th in Bogotá, even though it's already the
    // 12th in UTC — this is the exact off-by-one a naive UTC read would get wrong.
    const justBefore = new Date('2026-08-12T04:59:59.999Z');
    expect(bogotaDateParts(justBefore)).toMatchObject({ year: 2026, month: 8, day: 11 });
  });

  it('bogotaDateParts handles a month boundary correctly', () => {
    // 04:59 UTC on Sep 1 is 23:59 Bogotá on Aug 31.
    const lastMinuteOfAugust = new Date('2026-09-01T04:59:00.000Z');
    expect(bogotaDateParts(lastMinuteOfAugust)).toMatchObject({ year: 2026, month: 8, day: 31 });
  });

  it('bogotaDateParts.dayOfWeek matches the UTC weekday for an instant safely inside the same calendar day in both zones', () => {
    const noonUtc = new Date('2026-08-12T12:00:00.000Z'); // 07:00 Bogotá, same date either way
    expect(bogotaDateParts(noonUtc).dayOfWeek).toBe(noonUtc.getUTCDay());
  });

  it('bogotaDateKey zero-pads single-digit months and days', () => {
    expect(bogotaDateKey(bogotaMidnightFromDateString('2026-01-05'))).toBe('2026-01-05');
  });

  it('bogotaMidnightOf returns the Bogotá midnight of whatever day the instant falls on', () => {
    // 14:00 UTC = 09:00 Bogotá on Aug 12 — midnight of that same Bogotá day is 05:00 UTC.
    const duringTheDay = new Date('2026-08-12T14:00:00.000Z');
    expect(bogotaMidnightOf(duringTheDay).toISOString()).toBe('2026-08-12T05:00:00.000Z');
  });

  it('a 9am-8pm Bogotá schedule stays 9am-8pm regardless of the process timezone (the original production bug)', () => {
    // Simulates a barber's shift boundaries stored/interpreted the way availabilityService does.
    const nineAmBogota = new Date(`2026-08-12T09:00:00-05:00`);
    const eightPmBogota = new Date(`2026-08-12T20:00:00-05:00`);
    expect(bogotaDateParts(nineAmBogota)).toMatchObject({ year: 2026, month: 8, day: 12 });
    // In UTC these are 14:00 and 01:00(+1 day) — a naive UTC-hour read would show 2pm-1am
    // instead of the intended 9am-8pm local schedule.
    expect(nineAmBogota.getUTCHours()).toBe(14);
    expect(eightPmBogota.getUTCHours()).toBe(1);
    expect(eightPmBogota.getUTCDate()).toBe(13);
  });
});
