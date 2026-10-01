import { useCallback, useEffect, useState } from 'react'
import './Leads.css'

const recordsBase = (import.meta.env.VITE_RECORDS_API_URL || '').replace(/\/$/, '')
const blank = { name: '', phone: '', alternative_phone: '', email: '', business_name: '', call_topics: '' }

async function leadRequest(path = '', options = {}) {
  const response = await fetch(`${recordsBase}/api/leads${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}`,
    },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const firstError = Object.values(result.errors || {})[0]?.[0]
    throw new Error(firstError || result.message || 'Could not reach the lead service.')
  }
  return result
}

export default function Leads({ page, onNavigate }) {
  const [form, setForm] = useState(blank)
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setBusinesses(await leadRequest()) }
    catch (loadError) { setError(loadError.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (page === 'businesses') load() }, [page, load])

  const update = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await leadRequest('', { method: 'POST', body: JSON.stringify(form) })
      setForm(blank)
      setNotice('Business saved. It is ready for a phone call when outbound calling is configured.')
      onNavigate('businesses')
    } catch (saveError) { setError(saveError.message) }
    finally { setSaving(false) }
  }

  if (page === 'lead-form') return <section className="leads-page">
    <div className="leads-heading"><h2>Add a business</h2><p>Store the contact and the topics the AI should discuss.</p></div>
    <form className="lead-form" onSubmit={submit}>
      <div className="lead-form-grid">
        <label>Company / business name <span>*</span><input required maxLength={160} value={form.business_name} onChange={update('business_name')} /></label>
        <label>Point of contact name <span>*</span><input required maxLength={120} value={form.name} onChange={update('name')} /></label>
        <label>Phone number <span>*</span><input type="tel" required maxLength={30} placeholder="+14155550123" value={form.phone} onChange={update('phone')} /></label>
        <label>Alternative phone number<input type="tel" maxLength={30} placeholder="Optional" value={form.alternative_phone} onChange={update('alternative_phone')} /></label>
        <label>Email<input type="email" maxLength={255} placeholder="Optional" value={form.email} onChange={update('email')} /></label>
        <label className="wide">Topics for the call <span>*</span><textarea required rows={5} maxLength={5000} placeholder="What should the AI discuss with this contact?" value={form.call_topics} onChange={update('call_topics')} /></label>
      </div>
      {error && <p className="lead-error" role="alert">{error}</p>}
      <div className="lead-form-actions"><button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save business'}</button></div>
    </form>
  </section>

  return <section className="leads-page">
    <div className="leads-heading leads-heading-row"><div><h2>Stored businesses</h2><p>Contacts and call topics saved by admins.</p></div><button onClick={() => onNavigate('lead-form')}>+ Add business</button></div>
    {notice && <p className="lead-notice" role="status">{notice}</p>}
    {error && <p className="lead-error" role="alert">{error}</p>}
    {loading ? <p className="lead-empty">Loading businesses…</p> : businesses.length === 0 ? <p className="lead-empty">No businesses stored yet.</p> :
      <div className="business-list">{businesses.map((business) => <article className="business-card" key={business.id}>
        <div className="business-title"><div><h3>{business.business_name}</h3><p>{business.name}</p></div><span>#{business.id}</span></div>
        <dl><div><dt>Phone</dt><dd>{business.phone}</dd></div><div><dt>Alternative</dt><dd>{business.alternative_phone || '—'}</dd></div><div><dt>Email</dt><dd>{business.email || '—'}</dd></div></dl>
        <div className="business-topics"><strong>Call topics</strong><p>{business.call_topics}</p></div>
        <p className="phone-pending">Phone calls will be available after an outbound calling provider is configured.</p>
      </article>)}</div>}
  </section>
}
