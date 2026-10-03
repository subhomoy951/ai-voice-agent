import { useCallback, useEffect, useMemo, useState } from 'react'
import './Calendar.css'
import Chevron from './Chevron.jsx'
import { TIMEZONE, parseTimestamp, calendarDate } from './time.js'

const labels = { meeting: 'Meeting', interview: 'Interview', call_reminder: 'Call reminder', callback: 'Callback', demo: 'Demo', appointment: 'Appointment', reminder: 'Reminder', follow_up: 'Follow-up', other: 'Other' }
const dayKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
const fullDate = date => date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const displayTime = (value, timezone = TIMEZONE) => value ? parseTimestamp(value).toLocaleString('en-IN', { timeZone: timezone, hour: 'numeric', minute: '2-digit' }) : ''
const eventDay = event => dayKey(calendarDate(parseTimestamp(event.starts_at)))

export default function Calendar({ refreshKey, onOpenCall }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => { const now = calendarDate(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [selectedDay, setSelectedDay] = useState(() => calendarDate())
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [view, setView] = useState('month')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionError, setActionError] = useState('')
  const [newStart, setNewStart] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState({ event_type: 'meeting', title: '', starts_at: '', ends_at: '', details: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/schedule-events', { headers: { Accept: 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` } })
      if (!response.ok) throw new Error('Could not load your schedule.')
      setEvents(await response.json())
      setError('')
    } catch (loadError) { setError(loadError.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [refreshKey, load])
  const filtered = useMemo(() => events.filter(event => (typeFilter === 'all' || event.event_type === typeFilter) && (statusFilter === 'all' || (event.status || 'confirmed') === statusFilter)), [events, typeFilter, statusFilter])
  const groups = useMemo(() => filtered.reduce((result, event) => { (result[eventDay(event)] ||= []).push(event); return result }, {}), [filtered])
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay())
  const weekCount = Math.ceil((month.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7)
  const days = Array.from({ length: weekCount * 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  const selectedItems = groups[dayKey(selectedDay)] || []
  const selectedEvent = filtered.find(event => event.id === selectedEventId)
  const visibleList = filtered.filter(event => { const date = calendarDate(parseTimestamp(event.starts_at)); return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth() }).sort((a, b) => parseTimestamp(a.starts_at) - parseTimestamp(b.starts_at))
  const navigate = offset => { const next = new Date(month.getFullYear(), month.getMonth() + offset, 1); setMonth(next); setSelectedDay(next); setSelectedEventId(null) }
  const selectDay = (date, eventId = null) => { setSelectedDay(date); setSelectedEventId(eventId); if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) setMonth(new Date(date.getFullYear(), date.getMonth(), 1)) }
  const changeStatus = async (id, action) => {
    setActionError('')
    try {
      const response = await fetch(`/api/schedule-events/${id}/${action}`, { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` } })
      if (!response.ok) throw new Error(`Could not ${action} this event.`)
      await load()
    } catch (reason) { setActionError(reason.message) }
  }
  const reschedule = async event => {
    event.preventDefault(); setActionError('')
    try {
      const response = await fetch(`/api/schedule-events/${selectedEventId}/reschedule`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` }, body: JSON.stringify({ starts_at: new Date(newStart).toISOString(), timezone: selectedEvent.timezone || TIMEZONE }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(Object.values(result.errors || {})[0]?.[0] || result.message || 'Could not reschedule this event.')
      setNewStart(''); await load()
    } catch (reason) { setActionError(reason.message) }
  }
  const createEvent = async event => {
    event.preventDefault(); setActionError('')
    try {
      const response = await fetch('/api/schedule-events', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` }, body: JSON.stringify({ event_type: draft.event_type, title: draft.title, details: draft.details, starts_at: new Date(draft.starts_at).toISOString(), ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null, timezone: TIMEZONE }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(Object.values(result.errors || {})[0]?.[0] || result.message || 'Could not create this event.')
      setDraft({ event_type: 'meeting', title: '', starts_at: '', ends_at: '', details: '' }); setShowCreate(false); await load()
    } catch (reason) { setActionError(reason.message) }
  }

  return <section className="calendar-page">
    <div className="calendar-heading"><div><h2>Calendar</h2><p>Review meetings, interviews, reminders and other scheduled events.</p></div><div className="calendar-heading-actions"><button onClick={() => setShowCreate(value => !value)}>{showCreate ? 'Close form' : '+ Add event'}</button><button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button></div></div>
    {error && <p className="records-error" role="alert">{error}</p>}
    {actionError && <p className="records-error" role="alert">{actionError}</p>}
    {showCreate && <form className="calendar-create" onSubmit={createEvent}><h3>New event</h3><div className="calendar-create-fields"><label>Type<select value={draft.event_type} onChange={event => setDraft({ ...draft, event_type: event.target.value })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Title<input required maxLength={160} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label><label>Start on this device<input required type="datetime-local" value={draft.starts_at} onChange={event => setDraft({ ...draft, starts_at: event.target.value })} /></label><label>End on this device<input type="datetime-local" value={draft.ends_at} onChange={event => setDraft({ ...draft, ends_at: event.target.value })} /></label><label className="wide">Notes<textarea rows={2} maxLength={2000} value={draft.details} onChange={event => setDraft({ ...draft, details: event.target.value })} /></label></div><button type="submit">Save event</button></form>}
    <div className="calendar-filters">
      <label>View<select value={view} onChange={event => setView(event.target.value)}><option value="month">Month</option><option value="list">List</option></select></label>
      <label>Type<select value={typeFilter} onChange={event => { setTypeFilter(event.target.value); setSelectedEventId(null) }}><option value="all">All types</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Status<select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setSelectedEventId(null) }}><option value="all">All statuses</option>{['tentative', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show'].map(status => <option value={status} key={status}>{status.replace('_', ' ')}</option>)}</select></label>
    </div>
    <div className="calendar-board" aria-busy={loading}>
      <div className="calendar-toolbar"><h3 aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3><div className="calendar-navigation"><button onClick={() => { const now = calendarDate(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); selectDay(now) }}>Today</button><button onClick={() => navigate(-1)} aria-label="Previous month"><Chevron left /></button><button onClick={() => navigate(1)} aria-label="Next month"><Chevron /></button></div></div>
      {view === 'month' ? <div className="calendar-scroll"><div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div className="calendar-weekday" key={day}>{day}</div>)}
        {days.map(date => { const key = dayKey(date); const items = groups[key] || []; return <div className={`calendar-cell${date.getMonth() !== month.getMonth() ? ' outside-month' : ''}${key === dayKey(selectedDay) ? ' selected-day' : ''}`} key={key}><button className={`calendar-date${key === dayKey(calendarDate()) ? ' today' : ''}`} aria-label={`${fullDate(date)}, ${items.length} events`} aria-pressed={key === dayKey(selectedDay)} onClick={() => selectDay(date)}>{date.getDate()}</button><div className="calendar-cell-events">{items.map(event => <button className={`calendar-event-chip ${event.event_type}`} key={event.id} onClick={() => selectDay(date, event.id)} title={`${displayTime(event.starts_at)} - ${event.title}`}><span>{displayTime(event.starts_at)} · {event.status || 'confirmed'}</span><strong>{event.title}</strong></button>)}</div></div> })}
      </div></div> : <div className="calendar-list">{visibleList.length ? visibleList.map(event => <button key={event.id} onClick={() => selectDay(calendarDate(parseTimestamp(event.starts_at)), event.id)}><strong>{parseTimestamp(event.starts_at).toLocaleDateString('en-IN', { timeZone: TIMEZONE, day: 'numeric', month: 'short' })}</strong><span>{displayTime(event.starts_at)}</span><span>{event.title}</span><em>{event.status || 'confirmed'}</em></button>) : <p>No events match these filters this month.</p>}</div>}
      <div className="calendar-legend"><span>Times shown in {TIMEZONE}</span></div>
    </div>
    <div className="calendar-day" aria-live="polite"><h3>{fullDate(selectedDay)}</h3>{selectedItems.length ? <div className="calendar-events">{selectedItems.map(event => <button className={`calendar-event-summary${selectedEventId === event.id ? ' selected' : ''}`} key={event.id} onClick={() => setSelectedEventId(event.id)}><strong>{displayTime(event.starts_at)}</strong><span>{event.title}</span><em>{event.status || 'confirmed'}</em></button>)}</div> : <div className="calendar-empty"><strong>{loading ? 'Loading schedule...' : error ? 'Schedule unavailable' : 'No matching events on this date'}</strong><p>Select another date or change the filters.</p></div>}</div>
    {selectedEvent && <section className="calendar-detail" aria-label="Event details"><div className="calendar-detail-head"><div><span className={`calendar-type ${selectedEvent.event_type}`}>{labels[selectedEvent.event_type] || selectedEvent.event_type}</span><h3>{selectedEvent.title}</h3></div><button onClick={() => setSelectedEventId(null)} aria-label="Close event details">Close</button></div>
      <dl><div><dt>Status</dt><dd>{selectedEvent.status || 'Confirmed'}</dd></div><div><dt>Starts</dt><dd>{displayTime(selectedEvent.starts_at, selectedEvent.timezone || TIMEZONE)} · {selectedEvent.timezone || TIMEZONE}</dd></div><div><dt>Ends</dt><dd>{selectedEvent.ends_at ? displayTime(selectedEvent.ends_at, selectedEvent.timezone || TIMEZONE) : 'Not set'}</dd></div><div><dt>Contact</dt><dd>{selectedEvent.contact_name || selectedEvent.lead_name || 'Unlinked contact'}</dd></div><div><dt>Location</dt><dd>{selectedEvent.location || 'Not set'}</dd></div><div><dt>Source</dt><dd>{selectedEvent.source || 'AI call'}</dd></div></dl>
      {selectedEvent.details && <p>{selectedEvent.details}</p>}
      <h4>Participants</h4>{selectedEvent.participants?.length ? <ul>{selectedEvent.participants.map((person, index) => <li key={person.id || index}>{person.name}{person.role ? ` · ${person.role}` : ''}{person.response_status ? ` · ${person.response_status}` : ''}</li>)}</ul> : <p>No participant details available.</p>}
      {selectedEvent.call_id && <button className="calendar-call-link" onClick={() => onOpenCall?.(selectedEvent.call_id)}>Open source call #{selectedEvent.call_id}</button>}
      <div className="calendar-actions"><button onClick={() => changeStatus(selectedEvent.id, 'complete')} disabled={selectedEvent.status === 'completed'}>Mark complete</button><button onClick={() => changeStatus(selectedEvent.id, 'cancel')} disabled={selectedEvent.status === 'cancelled'}>Cancel event</button></div>
      <form className="calendar-reschedule" onSubmit={reschedule}><label>New start on this device<input type="datetime-local" required value={newStart} onChange={event => setNewStart(event.target.value)} /></label><button type="submit">Reschedule</button></form>
      {actionError && <p className="records-error" role="alert">{actionError}</p>}
    </section>}
  </section>
}
