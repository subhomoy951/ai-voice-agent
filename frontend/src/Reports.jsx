import { useEffect, useState } from 'react'
import { TIMEZONE, calendarDate, parseTimestamp } from './time.js'
import { buildReportCsv, downloadExcel, downloadPdf } from './reportExport.js'
import { splitMeetingSchedules } from './reportMeetings.js'
import ReportingAgent from './ReportingAgent.jsx'
import './Reports.css'
import './ReportsGraphs.css'

const statusNames = { completed: 'Completed', failed: 'Failed', in_progress: 'In progress', queued: 'Queued' }
const dateKey = value => {
  const date = calendarDate(parseTimestamp(value))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const duration = call => {
  const seconds = Number(call.duration_seconds) || (call.started_at && call.ended_at ? Math.max(0, (parseTimestamp(call.ended_at) - parseTimestamp(call.started_at)) / 1000) : 0)
  return Math.round(seconds)
}
const minutes = seconds => seconds ? `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s` : '—'
const percent = (part, total) => total ? `${Math.round(part / total * 100)}%` : '—'
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dayParts = ['00–06', '06–12', '12–18', '18–24']

function RateChart({ points }) {
  const plotted = points.map((point, index) => ({ ...point, x: 42 + index * 522 / Math.max(1, points.length - 1), y: 178 - point.rate * 1.4 }))
  const line = plotted.map((point, index) => point.total ? `${index && plotted[index - 1].total ? 'L' : 'M'} ${point.x} ${point.y}` : '').join(' ')
  const area = plotted.length && plotted.every(point => point.total) ? `42,178 ${plotted.map(point => `${point.x},${point.y}`).join(' ')} ${plotted.at(-1).x},178` : ''
  return <div className="reports-rate-chart">
    <svg viewBox="0 0 600 220" preserveAspectRatio="none" role="img" aria-label={points.map(point => `${point.label}: ${point.total ? `${point.rate}% completion from ${point.total} finished calls` : 'no finished calls'}`).join('; ')}>
      {[0, 25, 50, 75, 100].map(value => <g key={value}><line x1="42" x2="574" y1={178 - value * 1.4} y2={178 - value * 1.4} className="reports-rate-grid"/><text x="30" y={182 - value * 1.4} textAnchor="end">{value}%</text></g>)}
      {plotted.some(point => point.total) && <>{area && <polygon points={area} className="reports-rate-area"/>}<path d={line} className="reports-rate-line"/>{plotted.filter(point => point.total).map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="5" className="reports-rate-point"><title>{point.label}: {point.rate}% ({point.completed}/{point.total})</title></circle>)}</>}
      {plotted.map((point, index) => <text key={index} x={point.x} y="207" textAnchor="middle">{point.label}</text>)}
    </svg>
    {!plotted.some(point => point.total) && <p>No finished calls to chart in this period.</p>}
  </div>
}

export default function Reports({ onOpenCall }) {
  const [calls, setCalls] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [range, setRange] = useState('30')
  const [assistant, setAssistant] = useState('all')
  const [view, setView] = useState('overview')
  const [exporting, setExporting] = useState('')
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const headers = { Accept: 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` }
    setLoading(true)
    const since = encodeURIComponent(new Date(Date.now() - 92 * 86400000).toISOString())
    const getArray = async path => {
      const response = await fetch(path, { headers, signal: controller.signal })
      if (!response.ok) throw new Error('Reports could not be loaded. Please try again.')
      const result = await response.json()
      if (!Array.isArray(result)) throw new Error('Reports received an unexpected response.')
      return result
    }
    const getSchedules = async () => {
      const all = []
      for (let offset = 0; ; offset += 1000) {
        const page = await getArray(`/api/schedule-events?from=${since}&offset=${offset}`)
        all.push(...page)
        if (page.length < 1000) return all
      }
    }
    Promise.all([getArray('/api/call-records'), getSchedules()]).then(([nextCalls, nextEvents]) => { setCalls(nextCalls); setEvents(nextEvents); setError('') })
      .catch(reason => { if (reason.name !== 'AbortError') setError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [refresh])

  const assistants = [...new Set(calls.map(call => call.assistant_name).filter(Boolean))].sort()
  const today = calendarDate()
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - Number(range) + 1)
  const inRange = value => calendarDate(parseTimestamp(value)) >= cutoff
  const filtered = calls.filter(call => inRange(call.created_at) && (assistant === 'all' || call.assistant_name === assistant))
  const filteredEvents = events.filter(event => event.call_id && inRange(event.created_at || event.starts_at) && filtered.some(call => Number(call.id) === Number(event.call_id)))
  const meetings = splitMeetingSchedules(events, cutoff, new Date(), assistant)
  const completed = filtered.filter(call => call.status === 'completed').length
  const failed = filtered.filter(call => call.status === 'failed').length
  const finished = filtered.filter(call => ['completed', 'failed'].includes(call.status)).length
  const totalSeconds = filtered.filter(call => call.status === 'completed').reduce((sum, call) => sum + duration(call), 0)
  const average = completed ? Math.round(totalSeconds / completed) : 0
  const periodDays = Number(range)
  const buckets = periodDays === 7 ? 7 : periodDays === 30 ? 10 : 12
  const bucketSize = Math.ceil(periodDays / buckets)
  const trend = Array.from({ length: buckets }, (_, index) => {
    const start = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + index * bucketSize)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + bucketSize)
    const items = filtered.filter(call => { const date = calendarDate(parseTimestamp(call.created_at)); return date >= start && date < end })
    return { label: start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), completed: items.filter(call => call.status === 'completed').length, failed: items.filter(call => call.status === 'failed').length, other: items.filter(call => call.status !== 'completed').length }
  })
  const peak = Math.max(1, ...trend.map(item => item.completed + item.other))
  const byAssistant = assistants.map(name => {
    const items = filtered.filter(call => call.assistant_name === name)
    return { name, total: items.length, completed: items.filter(call => call.status === 'completed').length }
  }).filter(item => item.total)
  const rateTrend = trend.map(item => {
    const total = item.completed + item.failed
    return { ...item, total, rate: total ? Math.round(item.completed / total * 100) : 0 }
  })
  const durationBands = [
    { label: '< 1 min', min: 0, max: 60 },
    { label: '1–3 min', min: 60, max: 180 },
    { label: '3–5 min', min: 180, max: 300 },
    { label: '5–10 min', min: 300, max: 600 },
    { label: '10+ min', min: 600, max: Infinity },
  ].map(band => ({ ...band, count: filtered.filter(call => call.status === 'completed' && duration(call) >= band.min && duration(call) < band.max).length }))
  const durationPeak = Math.max(1, ...durationBands.map(band => band.count))
  const heatmap = dayNames.map((day, dayIndex) => dayParts.map((part, partIndex) => ({ day, part, count: filtered.filter(call => {
    const date = calendarDate(parseTimestamp(call.created_at))
    const weekday = (date.getDay() + 6) % 7
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', hourCycle: 'h23' }).format(parseTimestamp(call.created_at)))
    return weekday === dayIndex && Math.floor(hour / 6) === partIndex
  }).length })))
  const heatPeak = Math.max(1, ...heatmap.flat().map(cell => cell.count))
  const reportData = { calls: filtered, events: filteredEvents.length, meetings, days: periodDays, assistant: assistant === 'all' ? 'All assistants' : assistant, completed, failed, finished, average, totalSeconds, trend, durationBands, heatmap, dayParts, byAssistant, duration }

  const exportCsv = () => {
    const blob = new Blob(['\uFEFF', buildReportCsv(reportData)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `call-report-${dateKey(new Date().toISOString())}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const exportReport = async (format) => {
    setExporting(format)
    setExportError('')
    try {
      await (format === 'pdf' ? downloadPdf(reportData) : downloadExcel(reportData))
    } catch (reason) {
      setExportError(`Could not create the ${format.toUpperCase()} report. ${reason.message || 'Please try again.'}`)
    } finally { setExporting('') }
  }

  return <section className="reports-page">
    <div className="reports-intro"><div><span className="reports-kicker">WORKSPACE INTELLIGENCE</span><h2>Reports</h2><p>Understand calling activity and the outcomes it creates.</p></div><div className="reports-intro-actions"><button className="reports-button" onClick={() => setRefresh(value => value + 1)} disabled={loading || !!exporting}>{loading ? 'Refreshing…' : '↻ Refresh'}</button><button className="reports-button" onClick={exportCsv} disabled={loading || !!exporting}>↓ CSV</button><button className="reports-button" onClick={() => exportReport('excel')} disabled={loading || !!exporting}>{exporting === 'excel' ? 'Creating…' : '↓ Excel'}</button><button className="reports-button reports-export" onClick={() => exportReport('pdf')} disabled={loading || !!exporting}>{exporting === 'pdf' ? 'Creating…' : '↓ PDF'}</button></div></div>
    <div className="reports-toolbar"><div className="reports-tabs" role="tablist" aria-label="Report view"><button role="tab" aria-selected={view === 'overview'} className={view === 'overview' ? 'selected' : ''} onClick={() => setView('overview')}>Overview</button><button role="tab" aria-selected={view === 'calls'} className={view === 'calls' ? 'selected' : ''} onClick={() => setView('calls')}>Call details</button></div><div className="reports-filters"><label>Period<select value={range} onChange={event => setRange(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label><label>Assistant<select value={assistant} onChange={event => setAssistant(event.target.value)}><option value="all">All assistants</option>{assistants.map(name => <option key={name} value={name}>{name}</option>)}</select></label></div></div>
    <div className="reports-scope"><span className="reports-scope-dot"/> Calls: latest 100 saved records · Past meetings: selected period · Upcoming meetings: all future dates · Times shown in {TIMEZONE}{loading && calls.length ? ' · Updating…' : ''}</div>
    {error && <div className="reports-error" role="alert">{error} <button onClick={() => setRefresh(value => value + 1)}>Retry</button></div>}
    {exportError && <div className="reports-error" role="alert">{exportError}</div>}
    {loading && !calls.length && !error ? <div className="reports-loading" role="status">Loading reports…</div> : <>
      <ReportingAgent key={`${range}-${assistant}`} days={range} assistant={assistant} onOpenCall={onOpenCall} />
      {view === 'overview' && <>
        <div className="reports-metrics"><article><span>CALLS IN PERIOD</span><strong>{filtered.length.toLocaleString()}</strong><small>Across selected assistants</small></article><article><span>COMPLETION RATE</span><strong>{percent(completed, finished)}</strong><small>{completed} of {finished} finished calls</small></article><article><span>AVERAGE DURATION</span><strong>{minutes(average)}</strong><small>Completed calls only</small></article><article><span>EVENTS CREATED</span><strong>{filteredEvents.length}</strong><small>Linked to calls in period</small></article></div>
        <div className="reports-grid"><article className="reports-panel reports-trend"><div className="reports-panel-head"><div><h3>Call volume</h3><p>Completed and other call statuses over time</p></div><span className="reports-legend"><i/> Completed <i/> Other</span></div><div className="reports-chart" role="img" aria-label={trend.map(item => `${item.label}: ${item.completed} completed, ${item.other} other`).join('; ')}><div className="reports-chart-grid"><span>{peak}</span><span>{Math.round(peak / 2)}</span><span>0</span></div><div className="reports-bars">{trend.map((item, index) => <div className="reports-bar-group" key={index} title={`${item.label}: ${item.completed} completed, ${item.other} other`}><div className="reports-bar-track"><div className="reports-bar-other" style={{ height: `${item.other / peak * 100}%` }}/><div className="reports-bar-completed" style={{ height: `${item.completed / peak * 100}%` }}/></div><span>{item.label}</span></div>)}</div></div>{!filtered.length && <p className="reports-chart-empty">No calls in this period. Try a wider date range.</p>}</article>
        <article className="reports-panel reports-status"><div className="reports-panel-head"><div><h3>Call status</h3><p>Distribution for this period</p></div></div><div className="reports-donut-wrap"><div className="reports-donut" style={{ '--complete': `${filtered.length ? completed / filtered.length * 100 : 0}%`, '--failed': `${filtered.length ? (completed + failed) / filtered.length * 100 : 0}%` }}><div><strong>{filtered.length}</strong><span>TOTAL CALLS</span></div></div><div className="reports-status-list">{[['Completed', completed, 'complete'], ['Failed', failed, 'failed'], ['In progress', filtered.filter(call => call.status === 'in_progress').length, 'progress'], ['Queued', filtered.filter(call => call.status === 'queued').length, 'queued']].map(([label, count, style]) => <div key={label}><span><i className={style}/>{label}</span><strong>{count}</strong></div>)}</div></div></article></div>
        <div className="reports-grid reports-advanced"><article className="reports-panel"><div className="reports-panel-head"><div><h3>Completion trend</h3><p>Completed as a share of finished calls in each interval</p></div><span className="reports-graph-caption">{periodDays === 7 ? 'DAILY' : `${bucketSize}-DAY INTERVALS`}</span></div><RateChart points={rateTrend}/></article><article className="reports-panel"><div className="reports-panel-head"><div><h3>Call duration</h3><p>Completed calls grouped by talk time</p></div><span className="reports-graph-caption">{completed} CALLS</span></div><div className="reports-duration-chart">{durationBands.map(band => <div className="reports-duration-row" key={band.label} title={`${band.label}: ${band.count} calls`}><span>{band.label}</span><div className="reports-duration-track"><div style={{ width: `${band.count / durationPeak * 100}%` }}/></div><strong>{band.count}</strong></div>)}</div>{!completed && <p className="reports-empty">No completed calls in this period.</p>}</article></div>
        <article className="reports-panel reports-heatmap-panel"><div className="reports-panel-head"><div><h3>Calling patterns</h3><p>Call starts by local weekday and time of day</p></div><span className="reports-graph-caption">{TIMEZONE}</span></div><div className="reports-heatmap-wrap"><div className="reports-heatmap"><span className="reports-heatmap-corner"/>{dayParts.map(part => <span className="reports-heatmap-colhead" key={part}>{part}</span>)}{heatmap.map((row, index) => <div className="reports-heatmap-row" key={dayNames[index]}><span className="reports-heatmap-day">{dayNames[index]}</span>{row.map(cell => <div key={cell.part} className={`reports-heatmap-cell${cell.count ? '' : ' no-data'}`} style={{ '--intensity': cell.count ? .18 + cell.count / heatPeak * .82 : 0 }} title={`${cell.day} ${cell.part}: ${cell.count} calls`}><span>{cell.count || '·'}</span></div>)}</div>)}</div><div className="reports-heatmap-aside"><strong>{filtered.length}</strong><span>call starts mapped</span><p>Use this view to see when recent calling activity is concentrated. Darker cells indicate more calls.</p><div className="reports-heatmap-key">Fewer <i/><i/><i/><i/> More</div></div></div></article>
        <article className="reports-panel reports-meetings-panel"><div className="reports-panel-head"><div><h3>Meeting schedules</h3><p>Meetings, interviews, demos and appointments included in downloads</p></div><span className="reports-graph-caption">UPCOMING + PAST</span></div><div className="reports-meeting-summary"><div><span>UPCOMING</span><strong>{meetings.upcoming.length}</strong><small>All future dates</small></div><div><span>PAST</span><strong>{meetings.past.length}</strong><small>Last {periodDays} days</small></div></div><div className="reports-meeting-preview">{[...meetings.upcoming.slice(0, 2), ...meetings.past.slice(0, 2)].map(event => <div key={event.id}><span>{parseTimestamp(event.starts_at).toLocaleString('en-IN', { timeZone: TIMEZONE, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span><strong>{event.title}</strong><em>{event.status || 'confirmed'}</em></div>)}{!meetings.upcoming.length && !meetings.past.length && <p className="reports-empty">No meeting schedules match this report.</p>}</div></article>
        <div className="reports-grid reports-bottom"><article className="reports-panel"><div className="reports-panel-head"><div><h3>Assistant performance</h3><p>Completed calls by assistant</p></div></div>{byAssistant.length ? <div className="reports-assistants">{byAssistant.map(item => <div className="reports-assistant" key={item.name}><div className="reports-avatar">{item.name.slice(0, 2).toUpperCase()}</div><div className="reports-assistant-detail"><div><strong>{item.name}</strong><span>{item.completed} / {item.total} completed</span></div><div className="reports-progress"><span style={{ width: percent(item.completed, item.total) }}/></div></div><b>{percent(item.completed, item.total)}</b></div>)}</div> : <p className="reports-empty">No assistant activity in this period.</p>}</article><article className="reports-panel reports-summary"><div className="reports-panel-head"><div><h3>Operational summary</h3><p>Signals from the current selection</p></div></div><div className="reports-summary-row"><span>Finished calls</span><strong>{finished}</strong></div><div className="reports-summary-row"><span>Failed calls</span><strong>{failed}</strong></div><div className="reports-summary-row"><span>Total completed talk time</span><strong>{minutes(totalSeconds)}</strong></div><div className="reports-summary-row"><span>Events per completed call</span><strong>{percent(filteredEvents.length, completed)}</strong></div></article></div>
      </>}
      {view === 'calls' && <article className="reports-panel reports-table-panel"><div className="reports-panel-head"><div><h3>Call details</h3><p>{filtered.length} calls match your filters</p></div></div><div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>CONTACT</th><th>DATE & TIME</th><th>ASSISTANT</th><th>DURATION</th><th>STATUS</th><th></th></tr></thead><tbody>{filtered.map(call => <tr key={call.id}><td><strong>{call.lead_name || 'Unknown contact'}</strong><small>Call #{call.id}</small></td><td>{parseTimestamp(call.created_at).toLocaleString('en-IN', { timeZone: TIMEZONE, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td>{call.assistant_name || '—'}</td><td>{minutes(duration(call))}</td><td><span className={`reports-status-pill ${call.status}`}>{statusNames[call.status] || call.status}</span></td><td><button onClick={() => onOpenCall(call.id)} aria-label={`View call ${call.id}`}>View →</button></td></tr>)}</tbody></table>{!filtered.length && <p className="reports-empty">No calls match these filters.</p>}</div></article>}
    </>}
  </section>
}
