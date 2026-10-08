import { useEffect, useState } from 'react'
import './LocalCallSchedules.css'

async function request(path, options = {}) {
  const response = await fetch(`/api/local-call-schedules${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(Object.values(data.errors || {})[0]?.[0] || data.message || (response.status === 404
    ? 'Call schedules API was not found. Restart Vite locally, or deploy the updated backend and .htaccess on the server.'
    : `Request failed (${response.status}).`))
  return data
}

export default function LocalCallSchedules({ contacts, onStart, active }) {
  const [schedules, setSchedules] = useState([])
  const [selected, setSelected] = useState(null)
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [assistant, setAssistant] = useState('Deblina')
  const [startsAt, setStartsAt] = useState('')
  const [chosen, setChosen] = useState([])
  const [contactType, setContactType] = useState('all')
  const [search, setSearch] = useState('')
  const [overrides, setOverrides] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [clock, setClock] = useState(Date.now())

  const load = async (id = selected?.id) => {
    try {
      const list = await request('')
      setSchedules(list)
      if (id) setSelected(await request(`/${id}`))
      setError('')
    } catch (reason) { setError(reason.message) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    const timer = window.setInterval(() => { setClock(Date.now()); load() }, 30000)
    return () => window.clearInterval(timer)
  }, [selected?.id])

  const toggle = id => setChosen(previous => previous.includes(id) ? previous.filter(value => value !== id) : previous.length < 500 ? [...previous, id] : previous)
  const create = async event => {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const record = await request('', { method: 'POST', body: JSON.stringify({
        title: title.trim(), topic: topic.trim(), assistant_name: assistant,
        starts_at: new Date(startsAt).toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        items: chosen.map(contact_id => ({ contact_id, topic: overrides[contact_id]?.trim() || topic.trim() })),
      }) })
      setSelected(record); setChosen([]); setTitle(''); setTopic(''); setStartsAt(''); setOverrides({})
      await load(record.id)
    } catch (reason) { setError(reason.message) }
    finally { setSaving(false) }
  }
  const action = async (path) => {
    try { setSelected(await request(path, { method: 'POST' })); await load(selected.id) }
    catch (reason) { setError(reason.message) }
  }
  const eligible = contacts.filter(contact => !contact.dnc && !['denied', 'withdrawn'].includes(contact.consent_status))
  const visibleContacts = eligible.filter(contact =>
    (contactType === 'all' || (contactType === 'business' ? !!contact.company : !contact.company))
    && `${contact.name} ${contact.company || ''} ${contact.phone || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  const selectAll = type => {
    const ids = eligible.filter(contact => type === 'business' ? !!contact.company : !contact.company).map(contact => contact.id)
    setChosen(previous => [...previous, ...ids.filter(id => !previous.includes(id))].slice(0, 500))
  }
  const firstPending = selected?.items?.find(item => item.status === 'pending')
  const ready = selected?.status === 'scheduled' && new Date(`${selected.starts_at.replace(' ', 'T')}Z`).getTime() <= clock
    && !selected.items.some(item => item.status === 'in_progress')

  return <section className="local-schedules">
    <header><h2>Call schedules</h2><p>Prepare several contacts. Start each conversation here on this computer, one at a time.</p></header>
    {error && <p role="alert" className="schedule-error">{error}</p>}
    <div className="schedule-layout">
      <form onSubmit={create} className="schedule-card">
        <h3>Create schedule</h3>
        <label>Title<input required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>Common topic<textarea required maxLength={2000} value={topic} onChange={event => setTopic(event.target.value)} /></label>
        <label>AI assistant<select value={assistant} onChange={event => setAssistant(event.target.value)}><option>Deblina</option><option>Subrata</option><option>Lead Qualification</option><option>Appointment Coordinator</option><option>Follow-up</option><option>Company Information</option></select></label>
        <label>Start date and time<input required type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label>
        <small>Displayed in your browser timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). The first call becomes ready at this time.</small>
        <h4>Choose business / individual contacts</h4>
        <div className="schedule-picker">
          <label>Show<select value={contactType} onChange={event => setContactType(event.target.value)}><option value="all">All contacts</option><option value="business">Businesses</option><option value="individual">Individuals</option></select></label>
          <label>Search contacts<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, business, or phone" /></label>
          <div className="schedule-bulk-actions"><button type="button" onClick={() => selectAll('business')}>Select all businesses</button><button type="button" onClick={() => selectAll('individual')}>Select all individuals</button><button type="button" onClick={() => setChosen([])}>Clear selection</button></div>
        </div>
        <div className="schedule-contacts">{visibleContacts.map(contact => <div key={contact.id}>
          <label><input type="checkbox" checked={chosen.includes(contact.id)} onChange={() => toggle(contact.id)} /> {contact.company ? `${contact.company} — ` : ''}{contact.name}</label>
          {chosen.includes(contact.id) && <input aria-label={`Topic for ${contact.name}`} placeholder="Optional topic for this contact" value={overrides[contact.id] || ''} onChange={event => setOverrides(previous => ({ ...previous, [contact.id]: event.target.value }))} />}
        </div>)}{visibleContacts.length === 0 && <p>No matching eligible contacts.</p>}</div>
        <p>{chosen.length} contact{chosen.length === 1 ? '' : 's'} selected. Calls follow selection order.</p>
        <button disabled={saving || !chosen.length}>{saving ? 'Saving…' : 'Schedule calls'}</button>
      </form>
      <div className="schedule-card"><h3>Schedules</h3>
        {schedules.length === 0 && <p>No call schedules yet.</p>}
        <div className="schedule-list">{schedules.map(schedule => <button key={schedule.id} className={selected?.id === schedule.id ? 'selected' : ''} onClick={() => load(schedule.id)}><strong>{schedule.title}</strong><span>{new Date(`${schedule.starts_at.replace(' ', 'T')}Z`).toLocaleString()} · {schedule.status}</span></button>)}</div>
        {selected && <div className="schedule-detail"><h3>{selected.title}</h3><p>{selected.topic}</p><p>Starts {new Date(`${selected.starts_at.replace(' ', 'T')}Z`).toLocaleString()} · {selected.status}</p>
          {selected.items.map(item => <div className="schedule-item" key={item.id}><div><strong>{item.position}. {item.company ? `${item.company} — ` : ''}{item.contact_name}</strong><small>{item.topic} · {item.ready || (ready && firstPending?.id === item.id) ? 'Ready' : item.status}</small></div><div>
            {item.id === firstPending?.id && ready && item.ready && !item.dnc && !['denied', 'withdrawn'].includes(item.consent_status) && <button disabled={active} onClick={() => onStart({ ...item, assistant_name: selected.assistant_name, schedule_id: selected.id })}>Prepare call</button>}
            {item.status === 'pending' && <button onClick={() => action(`/${selected.id}/items/${item.id}/skip`)}>Skip</button>}
            {item.status === 'failed' && <button onClick={() => action(`/${selected.id}/items/${item.id}/retry`)}>Retry</button>}
            {item.call_id && <span>Call #{item.call_id}</span>}
          </div></div>)}
          {selected.status === 'scheduled' && <button className="schedule-cancel" onClick={() => action(`/${selected.id}/cancel`)}>Cancel schedule</button>}
        </div>}
      </div>
    </div>
  </section>
}
