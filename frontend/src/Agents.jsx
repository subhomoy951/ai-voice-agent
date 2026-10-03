import { useEffect, useState } from 'react'
import './Agents.css'

const blank = { name: '', purpose: '', voice: '', language: '', opening_message: '', system_prompt: '', status: 'draft' }
async function request(path = '', options = {}) {
  const response = await fetch(`/api/ai-agents${path}`, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(Object.values(data.errors || {})[0]?.[0] || data.message || 'Could not save the agent.')
  return data
}

export default function Agents() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  useEffect(() => { request().then(setAgents).catch(reason => setError(reason.message)).finally(() => setLoading(false)) }, [])
  const open = agent => { setEditing(agent?.id || 'new'); setForm(agent ? Object.fromEntries(Object.keys(blank).map(key => [key, agent[key] || (key === 'status' ? 'draft' : '')])) : blank); setError('') }
  const save = async event => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const agent = await request(editing === 'new' ? '' : `/${editing}`, { method: editing === 'new' ? 'POST' : 'PUT', body: JSON.stringify(form) })
      setAgents(previous => editing === 'new' ? [...previous, agent] : previous.map(item => item.id === agent.id ? agent : item))
      setEditing(null)
    } catch (reason) { setError(reason.message) }
    finally { setSaving(false) }
  }
  return <section className="agents-page">
    <div className="agents-heading"><div><h2>AI agents</h2><p>Configure purpose, voice and instructions for each agent.</p></div><button onClick={() => open(null)}>+ Add agent</button></div>
    {error && <p className="agents-note" role="alert">{error}</p>}
    {editing && <form className="agent-form" onSubmit={save}><div className="agent-form-head"><h3>{editing === 'new' ? 'New agent' : 'Edit agent'}</h3><button type="button" onClick={() => setEditing(null)}>Close</button></div><div className="agent-fields">
      <label>Name <input required maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      <label>Purpose <input maxLength={160} value={form.purpose} onChange={event => setForm({ ...form, purpose: event.target.value })} /></label>
      <label>Voice <input maxLength={80} value={form.voice} onChange={event => setForm({ ...form, voice: event.target.value })} /></label>
      <label>Language <input maxLength={30} value={form.language} onChange={event => setForm({ ...form, language: event.target.value })} /></label>
      <label>Status <select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{['draft', 'active', 'paused', 'archived'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="wide">Opening message <textarea rows={2} maxLength={2000} value={form.opening_message} onChange={event => setForm({ ...form, opening_message: event.target.value })} /></label>
      <label className="wide">System instructions <textarea rows={5} maxLength={10000} value={form.system_prompt} onChange={event => setForm({ ...form, system_prompt: event.target.value })} /></label>
    </div><button className="agent-save" disabled={saving}>{saving ? 'Saving...' : 'Save agent'}</button></form>}
    {loading ? <p className="agents-note">Loading agents...</p> : <div className="agents-grid">{agents.map(agent => <article className="agent-card" key={agent.id}><div className="agent-avatar">{agent.name.slice(0, 2).toUpperCase()}</div><div><h3>{agent.name}</h3><p>{agent.purpose || 'Purpose not set'}</p></div><dl><div><dt>Voice</dt><dd>{agent.voice || 'Default'}</dd></div><div><dt>Language</dt><dd>{agent.language || 'Not set'}</dd></div><div><dt>Status</dt><dd>{agent.status}</dd></div><div><dt>Version</dt><dd>{agent.version}</dd></div></dl><button className="agent-edit" onClick={() => open(agent)}>Edit</button></article>)}</div>}
    {!loading && agents.length === 0 && <p className="agents-note">No agents are configured yet.</p>}
  </section>
}
