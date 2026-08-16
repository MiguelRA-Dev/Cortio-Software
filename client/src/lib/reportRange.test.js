import { describe, it, expect } from 'vitest'
import { getRangeDates } from './reportRange'

describe('getRangeDates: custom range', () => {
  // Regression test: `new Date('2026-08-16')` parses as UTC midnight, not local
  // midnight — in a negative-UTC-offset timezone (e.g. Bogotá, UTC-5) the old
  // implementation silently shifted the whole range back a day, so a custom range
  // that visually included today excluded everything from today entirely.
  it("a range from today to today includes right now", () => {
    const now = new Date()
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const { from, to } = getRangeDates('custom', todayKey, todayKey)

    expect(new Date(from).getTime()).toBeLessThanOrEqual(now.getTime())
    expect(new Date(to).getTime()).toBeGreaterThanOrEqual(now.getTime())
  })

  it('spans local midnight to local 23:59:59.999 of the picked day, not the day before', () => {
    const { from, to } = getRangeDates('custom', '2026-08-16', '2026-08-16')
    const fromDate = new Date(from)
    const toDate = new Date(to)

    expect(fromDate.getFullYear()).toBe(2026)
    expect(fromDate.getMonth()).toBe(7)
    expect(fromDate.getDate()).toBe(16)
    expect(fromDate.getHours()).toBe(0)
    expect(fromDate.getMinutes()).toBe(0)

    expect(toDate.getDate()).toBe(16)
    expect(toDate.getHours()).toBe(23)
    expect(toDate.getMinutes()).toBe(59)
  })

  it('a multi-day custom range still spans from the start of the first day to the end of the last', () => {
    const { from, to } = getRangeDates('custom', '2026-08-10', '2026-08-16')
    const fromDate = new Date(from)
    const toDate = new Date(to)

    expect(fromDate.getDate()).toBe(10)
    expect(fromDate.getHours()).toBe(0)
    expect(toDate.getDate()).toBe(16)
    expect(toDate.getHours()).toBe(23)
  })
})
