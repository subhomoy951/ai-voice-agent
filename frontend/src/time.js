export let TIMEZONE = 'Asia/Kolkata'
export function setTimezone(value) {
  new Intl.DateTimeFormat('en-US', { timeZone: value })
  TIMEZONE = value
}

// Laravel stores timestamps in UTC without an explicit offset.
export function parseTimestamp(value) {
  const normalized = value.replace(' ', 'T')
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`)
}

// Calendar arithmetic uses date-only values in the selected timezone.
export function calendarDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE, year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date)
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return new Date(Number(fields.year), Number(fields.month) - 1, Number(fields.day))
}
