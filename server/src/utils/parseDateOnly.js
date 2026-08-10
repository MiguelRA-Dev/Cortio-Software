const { bogotaMidnightFromDateString } = require('./bogotaTime');

function parseDateOnly(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return new Date(NaN);
  return bogotaMidnightFromDateString(dateStr);
}

module.exports = parseDateOnly;
