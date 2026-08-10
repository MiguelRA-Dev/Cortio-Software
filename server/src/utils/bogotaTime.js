// Colombia is fixed at UTC-5 year-round (no DST) — using an explicit offset here means
// these calculations are correct regardless of what timezone the Node process itself
// happens to run in, instead of depending on server-local Date methods (setHours,
// getDay, etc.), which silently break the moment the app runs somewhere other than the
// developer's own machine (e.g. Azure defaults its Linux containers to UTC).
const OFFSET_HOURS = 5;

// Bogotá midnight (00:00) for a "YYYY-MM-DD" string, as an absolute instant.
function bogotaMidnightFromDateString(dateStr) {
  return new Date(`${dateStr}T00:00:00-05:00`);
}

// { year, month, day, dayOfWeek } as they read on the Bogotá calendar for `instant` —
// computed via UTC getters only, so the result never depends on the server's own
// configured timezone.
function bogotaDateParts(instant) {
  const shifted = new Date(instant.getTime() - OFFSET_HOURS * 60 * 60000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay()
  };
}

function bogotaDateKey(instant) {
  const { year, month, day } = bogotaDateParts(instant);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Bogotá midnight for whatever Bogotá calendar day `instant` falls on.
function bogotaMidnightOf(instant) {
  return bogotaMidnightFromDateString(bogotaDateKey(instant));
}

module.exports = { bogotaMidnightFromDateString, bogotaDateParts, bogotaDateKey, bogotaMidnightOf };
