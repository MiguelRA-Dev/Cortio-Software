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
  return { from: startOfDay(new Date(customFrom)).toISOString(), to: endOfDay(new Date(customTo)).toISOString() }
}
