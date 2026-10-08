import { useState } from 'react'

const topics = [
  ['activity', 'Call activity'],
  ['outcomes', 'Recorded outcomes'],
  ['appointments', 'Appointment requests'],
  ['review', 'Calls needing review'],
]

export default function ReportingAgent({ days, assistant, onOpenCall }) {
  const [topic, setTopic] = useState('activity')
  const [answer, setAnswer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true)
    setError('')
    setAnswer(null)
    try {
      const query = new URLSearchParams({ topic, days, assistant })
      const response = await fetch(`/api/reporting-agent?${query}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'The reporting agent could not load this answer.')
      setAnswer(result)
    } catch (reason) { setError(reason.message) }
    finally { setLoading(false) }
  }

  return <article className="reports-panel reporting-agent">
    <div className="reports-panel-head"><div><h3>Reporting agent</h3><p>Ask for a read-only finding backed by saved records.</p></div></div>
    <div className="reporting-agent-controls"><label>What should I report?<select value={topic} onChange={event => { setTopic(event.target.value); setAnswer(null) }}>{topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="reports-button" onClick={run} disabled={loading}>{loading ? 'Checking records…' : 'Show answer'}</button></div>
    {error && <p role="alert" className="reports-error">{error}</p>}
    {answer && <div className="reporting-agent-answer"><p>{answer.scope}</p><div className="reporting-agent-facts">{Object.entries(answer.facts).map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>{answer.note && <p>{answer.note}</p>}<h4>Supporting calls ({answer.evidence_total})</h4>{answer.evidence.length ? <ul>{answer.evidence.map(item => <li key={item.call_id}><button type="button" onClick={() => onOpenCall(item.call_id)}>Call #{item.call_id} · {item.contact_name || 'Contact'} · {item.outcome || item.status}</button></li>)}</ul> : <p>No supporting calls in this selection.</p>}{answer.evidence_total > answer.evidence.length && <p>Showing the newest {answer.evidence.length} calls.</p>}</div>}
  </article>
}
