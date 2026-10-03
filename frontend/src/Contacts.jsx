import { useCallback, useEffect, useState } from 'react'
import './Leads.css'

const individualTypes = ['lead', 'customer', 'candidate', 'employee', 'student', 'vendor', 'member', 'other']
const emptyBusiness = { business_name: '', name: '', phone: '', alternative_phone: '', email: '', call_topics: '' }
const emptyIndividual = { type: 'candidate', name: '', phone: '', alternative_phone: '', email: '', consent_status: 'unknown', dnc: false }

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`/api/${path}`, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}` } })
  } catch {
    throw new Error('Could not connect to the records service. Check that Laravel is running.')
  }
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new Error(`The ${path === 'contacts' ? 'contacts' : 'business'} API returned a page instead of JSON (HTTP ${response.status}). Check the frontend proxy and Laravel routes.`)
  }
  const data = await response.json().catch(() => { throw new Error(`The ${path === 'contacts' ? 'contacts' : 'business'} API returned invalid JSON.`) })
  if (!response.ok) throw new Error(Object.values(data.errors || {})[0]?.[0] || data.message || `The request failed (HTTP ${response.status}).`)
  return data
}

export default function Contacts({ startAdding = false }) {
  const [items, setItems] = useState([])
  const [kind, setKind] = useState('business')
  const [business, setBusiness] = useState(emptyBusiness)
  const [individual, setIndividual] = useState(emptyIndividual)
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(startAdding)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await request('contacts')
      if (!Array.isArray(result)) throw new Error('The contacts API returned an unexpected response. Check the frontend proxy and Laravel routes.')
      setItems(result)
      return true
    } catch (reason) {
      setLoadError(`Could not load contacts: ${reason.message}`)
      return false
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const changeBusiness = field => event => setBusiness(previous => ({ ...previous, [field]: event.target.value }))
  const changeIndividual = field => event => setIndividual(previous => ({ ...previous, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  const save = async event => {
    event.preventDefault(); setSaving(true); setSaveError(''); setNotice('')
    try {
      if (kind === 'business') await request('leads', { method: 'POST', body: JSON.stringify(business) })
      else await request('contacts', { method: 'POST', body: JSON.stringify(individual) })
      setBusiness(emptyBusiness); setIndividual(emptyIndividual); setAdding(false)
      setNotice(`${kind === 'business' ? 'Business' : 'Individual'} saved.`)
      await load()
    } catch (reason) { setSaveError(`Could not save ${kind}: ${reason.message}`) }
    finally { setSaving(false) }
  }
  const visible = items.filter(item => filter === 'all' || (filter === 'business' ? !!item.company : !item.company))
  return <section className="leads-page"><div className="leads-heading leads-heading-row"><div><h2>Business & individual contacts</h2><p>Keep company enquiries and individual people in one place.</p></div><button onClick={() => setAdding(value => !value)}>{adding ? 'Close form' : '+ Add'}</button></div>
    {loadError && <p className="lead-error" role="alert">{loadError} <button className="contact-retry" onClick={load}>Retry loading</button></p>}
    {saveError && <p className="lead-error" role="alert">{saveError}</p>}
    {notice && <p className="lead-notice" role="status">{notice}</p>}
    {adding && <form className="lead-form" onSubmit={save}>
      <fieldset className="contact-kind"><legend>Add</legend><label><input type="radio" name="contact-kind" checked={kind === 'business'} onChange={() => setKind('business')} /> Business</label><label><input type="radio" name="contact-kind" checked={kind === 'individual'} onChange={() => setKind('individual')} /> Individual</label></fieldset>
      {kind === 'business' ? <div className="lead-form-grid">
        <label>Business name <span>*</span><input required maxLength={160} value={business.business_name} onChange={changeBusiness('business_name')} /></label>
        <label>Point of contact <span>*</span><input required maxLength={120} value={business.name} onChange={changeBusiness('name')} /></label>
        <label>Phone <span>*</span><input required type="tel" maxLength={30} value={business.phone} onChange={changeBusiness('phone')} /></label>
        <label>Alternative phone<input type="tel" maxLength={30} value={business.alternative_phone} onChange={changeBusiness('alternative_phone')} /></label>
        <label>Email<input type="email" maxLength={255} value={business.email} onChange={changeBusiness('email')} /></label>
        <label className="wide">Call topics <span>*</span><textarea required rows={4} maxLength={5000} value={business.call_topics} onChange={changeBusiness('call_topics')} /></label>
      </div> : <div className="lead-form-grid">
        <label>Individual type <span>*</span><select value={individual.type} onChange={changeIndividual('type')}>{individualTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
        <label>Name <span>*</span><input required maxLength={120} value={individual.name} onChange={changeIndividual('name')} /></label>
        <label>Phone<input type="tel" maxLength={30} value={individual.phone} onChange={changeIndividual('phone')} /></label>
        <label>Alternative phone<input type="tel" maxLength={30} value={individual.alternative_phone} onChange={changeIndividual('alternative_phone')} /></label>
        <label>Email<input type="email" maxLength={255} value={individual.email} onChange={changeIndividual('email')} /></label>
        <label>Consent<select value={individual.consent_status} onChange={changeIndividual('consent_status')}><option value="unknown">Unknown</option><option value="granted">Granted</option><option value="denied">Denied</option><option value="withdrawn">Withdrawn</option></select></label>
        <label className="contact-check"><input type="checkbox" checked={individual.dnc} onChange={changeIndividual('dnc')} /> Do not call</label>
      </div>}
      <div className="lead-form-actions"><button disabled={saving}>{saving ? 'Saving...' : `Save ${kind}`}</button></div>
    </form>}
    <div className="contact-filter"><label>Show<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All</option><option value="business">Business</option><option value="individual">Individual</option></select></label><span>{loading || loadError ? '—' : visible.length} records</span></div>
    {loading ? <p className="lead-empty" role="status">Loading contacts...</p> : loadError ? null : visible.length ? <div className="business-list">{visible.map(item => <article className="business-card" key={item.id}><div className="business-title"><div><h3>{item.company || item.name}</h3><p>{item.company ? `Point of contact: ${item.name}` : item.type}</p></div><span>{item.company ? 'Business' : 'Individual'}</span></div><dl><div><dt>Phone</dt><dd>{item.phone || '—'}</dd></div><div><dt>Alternative</dt><dd>{item.alternative_phone || '—'}</dd></div><div><dt>Email</dt><dd>{item.email || '—'}</dd></div></dl>{item.company && <div className="business-topics"><strong>Call topics</strong><p>{JSON.parse(item.metadata_json || '{}').call_topics || '—'}</p></div>}{!item.company && <p className="phone-pending">{item.dnc ? 'Do not call' : `Consent: ${item.consent_status}`}</p>}</article>)}</div> : <p className="lead-empty">No records in this view.</p>}
  </section>
}
