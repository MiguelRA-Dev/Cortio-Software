function timeStringToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function combineDateAndMinutes(date, minutes) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setMinutes(minutes);
  return result;
}

// busyRanges holds anything the caller found for that day that occupies the barber's
// time — booked appointments AND self-declared TimeBlocks alike, both just need a
// startTime/endTime to be checked for overlap the same way.
function getAvailableSlots({ barber, date, durationMinutes, busyRanges }) {
  const dayOfWeek = date.getDay();
  const dateKey = date.toISOString().slice(0, 10);

  const exception = (barber.scheduleExceptions || []).find(
    (ex) => new Date(ex.date).toISOString().slice(0, 10) === dateKey
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
