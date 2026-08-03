import { format } from 'date-fns'

// `date.toISOString().slice(0, 10)` extracts the UTC calendar date, which silently
// rolls over to the next day once local time crosses UTC — e.g. any time from 7pm
// onward in Colombia (UTC-5). Use this instead for "what calendar day is this in the
// user's own timezone" — matches how the date was actually picked/displayed. Use for
// real timestamps: "now", an appointment's startTime, anything with a meaningful time
// of day.
export function toDateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

// Pure date-only values (an expense's `date`, a payroll period boundary) round-trip
// through the backend as UTC midnight — `new Date('2026-08-01')` parses as UTC, not
// local. Extracting via UTC here is correct and required; using toDateKey (local) on
// these would shift the date backward a day in negative-UTC-offset timezones like
// Colombia. Only use this for values that came from a plain YYYY-MM-DD, never for
// "now" or any timestamp with a real time of day.
export function toUtcDateInput(date) {
  return date.toISOString().slice(0, 10)
}
