import test from 'node:test'
import assert from 'node:assert/strict'
import { splitMeetingSchedules } from '../src/reportMeetings.js'

test('includes upcoming schedules and only recent past meetings', () => {
  const events = [
    { id: 1, event_type: 'meeting', starts_at: '2026-10-08 10:00:00', call_id: null },
    { id: 2, event_type: 'demo', starts_at: '2026-10-05 10:00:00', call_id: 7, call_assistant_name: 'Deblina' },
    { id: 3, event_type: 'interview', starts_at: '2026-09-01 10:00:00', call_id: 7 },
    { id: 4, event_type: 'reminder', starts_at: '2026-10-09 10:00:00', call_id: 7 },
  ]
  const result = splitMeetingSchedules(events, new Date(2026, 9, 1), new Date('2026-10-06T00:00:00Z'))
  assert.deepEqual(result.upcoming.map(item => item.id), [1])
  assert.deepEqual(result.past.map(item => item.id), [2])
  const assistantResult = splitMeetingSchedules(events, new Date(2026, 9, 1), new Date('2026-10-06T00:00:00Z'), 'Deblina')
  assert.deepEqual(assistantResult.upcoming.map(item => item.id), [])
  assert.deepEqual(assistantResult.past.map(item => item.id), [2])
})
