const { bogotaDateParts, bogotaDateKey } = require('../utils/bogotaTime');

function timeStringToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// `bogotaMidnight` must already be Bogotá midnight (see bogotaTime.js) — from there,
// adding plain minutes as milliseconds is timezone-agnostic and always correct, unlike
// the previous version's setHours/setMinutes calls (which used the server process's
// own local timezone, not Colombia's).
function combineDateAndMinutes(bogotaMidnight, minutes) {
  return new Date(bogotaMidnight.getTime() + minutes * 60000);
}

// busyRanges holds anything the caller found for that day that occupies the barber's
// time — booked appointments AND self-declared TimeBlocks alike, both just need a
// startTime/endTime to be checked for overlap the same way.
function getAvailableSlots({ barber, date, durationMinutes, busyRanges }) {
  const { dayOfWeek } = bogotaDateParts(date);
  const dateKey = bogotaDateKey(date);

  const exception = (barber.scheduleExceptions || []).find(
    (ex) => bogotaDateKey(new Date(ex.date)) === dateKey
  );

  let ranges;
  if (exception) {
    if (!exception.available) return [];
    ranges = [{ startTime: exception.startTime, endTime: exception.endTime }];
  } else {
    ranges = (barber.schedule || []).filter((s) => s.dayOfWeek === dayOfWeek);
  }

  if (ranges.length === 0) return [];

  const now = new Date();
  const slots = [];

  for (const range of ranges) {
    const startMinutes = timeStringToMinutes(range.startTime);
    const endMinutes = timeStringToMinutes(range.endTime);

    for (let slotStart = startMinutes; slotStart + durationMinutes <= endMinutes; slotStart += durationMinutes) {
      const slotStartDate = combineDateAndMinutes(date, slotStart);
      const slotEndDate = combineDateAndMinutes(date, slotStart + durationMinutes);

      if (slotStartDate < now) continue;

      const overlaps = busyRanges.some(
        (range) => slotStartDate < range.endTime && slotEndDate > range.startTime
      );
      if (overlaps) continue;

      slots.push(slotStartDate.toISOString());
    }
  }

  return slots;
}

module.exports = { getAvailableSlots };
