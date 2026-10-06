import { calendarDate, parseTimestamp } from './time.js'

export const meetingTypes = new Set(['meeting', 'interview', 'demo', 'appointment'])

export function splitMeetingSchedules(events, cutoff, now, assistant = 'all') {
  const meetings = events.filter(event => meetingTypes.has(event.event_type) && event.starts_at && (
    assistant === 'all' || event.call_assistant_name === assistant
  ))
  return {
    upcoming: meetings.filter(event => parseTimestamp(event.starts_at) >= now).sort((a, b) => parseTimestamp(a.starts_at) - parseTimestamp(b.starts_at)),
    past: meetings.filter(event => parseTimestamp(event.starts_at) < now && calendarDate(parseTimestamp(event.starts_at)) >= cutoff).sort((a, b) => parseTimestamp(b.starts_at) - parseTimestamp(a.starts_at)),
  }
}
