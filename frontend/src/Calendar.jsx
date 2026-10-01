import { useEffect, useState } from 'react'
import './Calendar.css'

const labels = { meeting: 'Meeting', interview: 'Interview', call_reminder: 'Call reminder', other: 'Other' }
const eventDate = (value) => new Date(`${value.replace(' ', 'T').replace(/Z$/, '')}Z`)

export default function Calendar({ refreshKey }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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
    const day = eventDate(event.starts_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    ;(result[day] ||= []).push(event)
    return result
  }, {})

  return <section className="calendar-page">
    <div className="calendar-heading"><div><h2>Upcoming schedule</h2><p>Meetings, interviews, call reminders and other plans captured during voice calls.</p></div><button onClick={() => { setLoading(true); load() }} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button></div>
    {error && <p className="records-error" role="alert">{error}</p>}
    {!loading && !error && events.length === 0 && <div className="calendar-empty"><strong>No upcoming events yet</strong><p>When a date and time are agreed during a call, the event will appear here automatically.</p></div>}
    {Object.entries(groups).map(([day, items]) => <div className="calendar-day" key={day}><h3>{day}</h3><div className="calendar-events">{items.map((event) => <article className="calendar-event" key={event.id}><div className="calendar-time">{eventDate(event.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div><div><span className={`calendar-type ${event.event_type}`}>{labels[event.event_type] || 'Other'}</span><h4>{event.title}</h4><p>{event.details || `Scheduled with ${event.lead_name}`}</p><small>{event.lead_name} · Call #{event.call_id}</small></div></article>)}</div></div>)}
  </section>
}
