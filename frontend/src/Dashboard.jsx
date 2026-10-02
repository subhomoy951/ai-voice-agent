import { useEffect, useState } from 'react'
import './Dashboard.css'
import Chevron from './Chevron.jsx'
import { TIMEZONE, parseTimestamp, calendarDate } from './time.js'

const parseDate = parseTimestamp
const dateKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
const statusLabels = { completed: 'Completed', failed: 'Failed', in_progress: 'In progress', queued: 'Queued' }

export default function Dashboard({ onNavigate, onOpenRecord }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    const headers = { Accept: 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` }
    Promise.all(['/api/leads', '/api/call-records', '/api/schedule-events'].map(async path => {
      const response = await fetch(path, { headers })
      if (!response.ok) throw new Error('Could not load dashboard data. Please try refreshing.')
      const result = await response.json()
      if (!Array.isArray(result)) throw new Error('The dashboard received an unexpected response.')
      return result
    })).then(([businesses, calls, events]) => { if (active) { setData({ businesses, calls, events, loadedAt: calendarDate() }); setError('') } })
      .catch(reason => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  const calls = data?.calls || []
  const completed = calls.filter(call => call.status === 'completed')
  const durations = completed.filter(call => call.started_at && call.ended_at).map(call => (parseDate(call.ended_at) - parseDate(call.started_at)) / 1000).filter(seconds => Number.isFinite(seconds) && seconds >= 0)
  const average = durations.length ? Math.round(durations.reduce((sum, seconds) => sum + seconds, 0) / durations.length) : null
  const days = data ? Array.from({ length: 7 }, (_, index) => new Date(data.loadedAt.getFullYear(), data.loadedAt.getMonth(), data.loadedAt.getDate() - 6 + index)) : []
  const activity = days.map(day => ({ day, count: calls.filter(call => dateKey(calendarDate(parseDate(call.created_at))) === dateKey(day)).length }))
  const peak = Math.max(1, ...activity.map(item => item.count))
  const metrics = [
    ['Stored businesses', data?.businesses.length, 'Contacts ready in your workspace'],
    ['Recent calls', calls.length, 'Latest 100 saved call records'],
    ['Completion rate', calls.length ? `${Math.round(completed.length / calls.length * 100)}%` : '\u2014', `${completed.length} completed recent calls`],
    ['Upcoming events', data?.events.length, 'Meetings, interviews and reminders'],
  ]
  return <section className="dashboard-page">
    <div className="dashboard-heading"><div><h2>Your workspace at a glance</h2><p>Call analytics cover the latest 100 saved records. Dates and times use {TIMEZONE}.</p></div><button disabled={loading} onClick={() => { setLoading(true); setRefresh(value => value + 1) }}>{loading ? 'Loading...' : 'Refresh'}</button></div>
    {error && <p className="lead-error" role="alert">{error}</p>}
    {!data && loading && <p role="status">Loading your dashboard...</p>}
    {data && <>
      <div className="dashboard-metrics">{metrics.map(([label, value, description]) => <article key={label}><span>{label}</span><strong>{value}</strong><p>{description}</p></article>)}</div>
      <div className="dashboard-panels">
        <article className="dashboard-card"><h3>Call activity</h3><p>Last 7 days &middot; {activity.reduce((sum, item) => sum + item.count, 0)} calls in recent records</p><div className="dashboard-chart" role="img" aria-label={activity.map(({ day, count }) => `${day.toLocaleDateString()}: ${count} calls`).join('; ')}>{activity.map(({ day, count }) => <div className="dashboard-bar-column" key={dateKey(day)}><strong>{count}</strong><div className="dashboard-bar-track"><div style={{ height: `${count / peak * 100}%` }} /></div><span>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span><small>{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div>)}</div></article>
        <article className="dashboard-card"><h3>Call outcomes</h3><p>Average completed call: {average == null ? 'No duration data yet' : `${Math.floor(average / 60)}m ${average % 60}s`}</p><div className="dashboard-outcomes">{Object.entries(statusLabels).map(([status, label]) => { const count = calls.filter(call => call.status === status).length; return <div key={status}><div><span>{label}</span><strong>{count}</strong></div><progress value={count} max={Math.max(1, calls.length)} aria-label={`${label}: ${count} calls`} /></div> })}</div></article>
        <article className="dashboard-card"><div className="dashboard-card-heading"><h3>Upcoming events</h3><button onClick={() => onNavigate('calendar')}>View calendar <Chevron /></button></div>{data.events.length ? data.events.slice(0, 5).map(event => <div className="dashboard-list-item" key={event.id}><strong>{event.title}</strong><span>{parseDate(event.starts_at).toLocaleString('en-IN', { timeZone: TIMEZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>) : <p className="dashboard-empty">No upcoming events yet. Plans captured during calls will appear here.</p>}</article>
        <article className="dashboard-card"><div className="dashboard-card-heading"><h3>Recent calls</h3><button onClick={() => onNavigate('recordings')}>View all <Chevron /></button></div>{calls.length ? calls.slice(0, 5).map(call => <button className="dashboard-list-item dashboard-call" key={call.id} onClick={() => onOpenRecord(call.id)}><strong>{call.lead_name}</strong><span className="dashboard-call-meta"><span>{statusLabels[call.status] || call.status}</span><time dateTime={parseDate(call.created_at).toISOString()}>{parseDate(call.created_at).toLocaleString('en-IN', { timeZone: TIMEZONE, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time><Chevron /></span></button>) : <p className="dashboard-empty">No saved calls yet. Open Calls to start your first session.</p>}</article>
      </div>
    </>}
    <div className="dashboard-actions"><button onClick={() => onNavigate('calls')}>Open calling desk</button><button onClick={() => onNavigate('lead-form')}>+ Add business</button><button onClick={() => onNavigate('businesses')}>View businesses</button></div>
  </section>
}
