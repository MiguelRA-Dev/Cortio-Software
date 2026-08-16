import { toDateKey } from './dates'

export const RANGE_PRESETS = [
  { id: '7d', label: 'Últimos 7 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'lastMonth', label: 'Mes pasado' },
  { id: 'custom', label: 'Personalizado' },
]

export function defaultCustomFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return toDateKey(d)
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

// `new Date('2026-08-16')` (a plain YYYY-MM-DD string, straight from an
// <input type="date">) parses as UTC midnight, not local midnight — in Bogotá
// (UTC-5) that instant reads as 7pm the *previous* local day, so the old
// `startOfDay(new Date(customFrom))` silently shifted the whole custom range back by
// a day and dropped anything from "today" entirely. Splitting the string and building
// the Date from (year, month, day) makes the engine interpret it as local midnight,
// matching what the visitor actually picked on the calendar.
function parseDateInputLocal(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getRangeDates(range, customFrom, customTo) {
  const now = new Date()
  if (range === '7d') {
    const from = startOfDay(now)
    from.setDate(from.getDate() - 6)
    return { from: from.toISOString(), to: endOfDay(now).toISOString() }
  }
  if (range === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: from.toISOString(), to: endOfDay(now).toISOString() }
  }
  if (range === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  return { from: startOfDay(parseDateInputLocal(customFrom)).toISOString(), to: endOfDay(parseDateInputLocal(customTo)).toISOString() }
}
