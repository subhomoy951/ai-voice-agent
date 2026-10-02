import { useEffect, useState } from 'react'
import './Calendar.css'

const labels = { meeting: 'Meeting', interview: 'Interview', call_reminder: 'Call reminder', other: 'Other' }
const eventDate = (value) => new Date(`${value.replace(' ', 'T').replace(/Z$/, '')}Z`)
const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
const timeLabel = (event) => eventDate(event.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const fullDate = (date) => date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export default function Calendar({ refreshKey }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [today, setToday] = useState(() => dayKey(new Date()))

  const load = async () => {
    try {
      const response = await fetch('/api/schedule-events', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` },
      })
      if (!response.ok) throw new Error('Could not load your schedule.')
      setEvents(await response.json())
      setError('')
    } catch (loadError) { setError(loadError.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [refreshKey])

  const groups = events.reduce((result, event) => {
    const day = dayKey(eventDate(event.starts_at))
    ;(result[day] ||= []).push(event)
    return result
  }, {})
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay())
  const weekCount = Math.ceil((month.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7)
  const days = Array.from({ length: weekCount * 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  const selectedItems = groups[dayKey(selectedDay)] || []
  const navigate = (offset) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(next)
    setSelectedDay(next)
    setSelectedEvent(null)
  }
  const selectDay = (date, eventId = null) => {
    setSelectedDay(date)
    setSelectedEvent(eventId)
    if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) setMonth(new Date(date.getFullYear(), date.getMonth(), 1))
  }

  return <section className="calendar-page">
    <div className="calendar-heading"><div><h2>Upcoming schedule</h2><p>Meetings, interviews, call reminders and other plans captured during voice calls.</p></div><button onClick={() => { setLoading(true); load() }} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button></div>
    {error && <p className="records-error" role="alert">{error}</p>}
    <div className="calendar-board" aria-busy={loading}>
      <div className="calendar-toolbar">
        <h3 aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <div className="calendar-navigation">
          <button onClick={() => { const now = new Date(); setToday(dayKey(now)); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); selectDay(now) }}>Today</button>
          <button onClick={() => navigate(-1)} aria-label="Previous month">‹</button>
          <button onClick={() => navigate(1)} aria-label="Next month">›</button>
        </div>
      </div>
      <div className="calendar-scroll">
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div className="calendar-weekday" key={day}>{day}</div>)}
          {days.map(date => {
            const key = dayKey(date)
            const items = groups[key] || []
            return <div className={`calendar-cell${date.getMonth() !== month.getMonth() ? ' outside-month' : ''}${key === dayKey(selectedDay) ? ' selected-day' : ''}`} key={key}>
              <button className={`calendar-date${key === today ? ' today' : ''}`} aria-label={`${fullDate(date)}, ${items.length} events`} aria-pressed={key === dayKey(selectedDay)} onClick={() => selectDay(date)}>{date.getDate()}</button>
              <div className="calendar-cell-events">{items.map(event => <button className={`calendar-event-chip ${event.event_type}`} key={event.id} onClick={() => selectDay(date, event.id)} aria-label={`${event.title}, ${timeLabel(event)}, ${fullDate(date)}`} title={`${timeLabel(event)} · ${event.title}`}><span>{timeLabel(event)}</span><strong>{event.title}</strong></button>)}</div>
            </div>
          })}
        </div>
      </div>
      <div className="calendar-legend">{Object.entries(labels).map(([type, label]) => <span key={type}><i className={type} />{label}</span>)}<span>Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div>
    </div>
    <div className="calendar-day" aria-live="polite"><h3>{fullDate(selectedDay)}</h3>
      {selectedItems.length > 0 ? <div className="calendar-events">{selectedItems.filter(event => selectedEvent == null || event.id === selectedEvent).map(event => <article className="calendar-event" key={event.id}><div className="calendar-time">{timeLabel(event)}</div><div><span className={`calendar-type ${event.event_type}`}>{labels[event.event_type] || 'Other'}</span><h4>{event.title}</h4><p>{event.details || `Scheduled with ${event.lead_name}`}</p><small>{event.lead_name} · Call #{event.call_id}</small></div></article>)}{selectedEvent != null && selectedItems.length > 1 && <button className="calendar-show-all" onClick={() => setSelectedEvent(null)}>Show all {selectedItems.length} events for this date</button>}</div> : <div className="calendar-empty"><strong>{loading ? 'Loading schedule…' : error ? 'Schedule unavailable' : 'No upcoming events on this date'}</strong><p>Select a date or event in the calendar to view its details.</p></div>}
    </div>
  </section>
}
