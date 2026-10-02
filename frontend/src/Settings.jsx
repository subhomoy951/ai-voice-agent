import { useEffect, useState } from 'react'
import { settingsRequest } from './settings.js'
import './Settings.css'

export default function Settings({ preferences, onSaved, admin, onAccountSaved, settingsReady, settingsError }) {
  const [form, setForm] = useState(preferences)
  const [account, setAccount] = useState({ name: admin.name, email: admin.email, current_password: '', password: '', password_confirmation: '' })
  const [saving, setSaving] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [accountMessage, setAccountMessage] = useState('')
  const [accountError, setAccountError] = useState('')
  const [status, setStatus] = useState({})
  const [checking, setChecking] = useState(false)
  const change = field => event => setForm(previous => ({ ...previous, [field]: event.target.value }))
  const accountChange = field => event => setAccount(previous => ({ ...previous, [field]: event.target.value }))
  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try { const result = await settingsRequest('settings', { method: 'PUT', body: JSON.stringify({ ...form, max_call_minutes: Number(form.max_call_minutes) }) }); onSaved(result); setForm(result); setMessage('Workspace settings saved. Call preferences apply to new calls.') }
    catch (reason) { setError(reason.message) } finally { setSaving(false) }
  }
  const saveAccount = async event => {
    event.preventDefault(); setAccountSaving(true); setAccountError(''); setAccountMessage('')
    try { const result = await settingsRequest('account', { method: 'PUT', body: JSON.stringify(account) }); onAccountSaved(result); setAccount(previous => ({ ...previous, current_password: '', password: '', password_confirmation: '' })); setAccountMessage('Account updated successfully.') }
    catch (reason) { setAccountError(reason.message) } finally { setAccountSaving(false) }
  }
  const checkStatus = async () => {
    setChecking(true)
    const results = await Promise.allSettled([
      settingsRequest('me'),
      fetch(import.meta.env.PROD ? '/ai/health' : '/api/ai-health', { signal: AbortSignal.timeout(10000) }).then(async response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); const result = await response.json(); if (result.status !== 'ok') throw new Error('Unexpected health response'); return result }),
    ])
    setStatus({ backend: results[0].status === 'fulfilled' ? 'Connected' : 'Unavailable', ai: results[1].status === 'fulfilled' ? 'Connected' : 'Unavailable', key: results[1].status === 'fulfilled' ? (results[1].value.openai_configured ? 'Configured' : 'Missing') : 'Unknown' }); setChecking(false)
  }
  useEffect(() => { checkStatus() }, [])
  const timezones = [...new Set(['Asia/Kolkata', 'UTC', 'Europe/London', 'America/New_York', 'Asia/Dubai', 'Asia/Singapore', preferences.timezone])]
  return <section className="settings-page">
    <div className="settings-heading"><h2>Workspace settings</h2><p>Workspace preferences are shared by admins. Your account details are personal.</p></div>
    {settingsError && <p className="lead-error" role="alert">{settingsError}</p>}
    <form onSubmit={save}>
      <fieldset disabled={!settingsReady || saving} className="settings-fields">
        <section className="settings-card"><h3>Business profile</h3><div className="settings-grid">
          <label>Company name<input value={form.business_name} onChange={change('business_name')} maxLength={160}/></label>
          <label>Contact email<input type="email" value={form.contact_email} onChange={change('contact_email')} maxLength={255}/></label>
          <label>Contact phone<input type="tel" value={form.contact_phone} onChange={change('contact_phone')} maxLength={30}/></label>
          <label>Logo URL<input type="url" placeholder="https://example.com/logo.png" value={form.logo_url} onChange={change('logo_url')} maxLength={2000}/></label>
        </div><p className="settings-help">Use a publicly accessible image URL for your logo.</p></section>
        <section className="settings-card"><h3>AI assistant</h3><div className="settings-grid">
          <label>Default assistant<select value={form.default_assistant} onChange={change('default_assistant')}><option value="deblina">Deblina · Female voice</option><option value="subrata">Subrata · Male voice</option></select></label>
          <label>Language<select value={form.language} onChange={change('language')}>{['English', 'Hindi', 'Bengali'].map(language => <option key={language}>{language}</option>)}</select></label>
          <label className="wide">Opening greeting<textarea required rows={2} maxLength={500} value={form.greeting} onChange={change('greeting')}/></label>
          <label className="wide">Call instructions<textarea rows={4} maxLength={5000} placeholder="What should the assistant discuss or ask?" value={form.instructions} onChange={change('instructions')}/></label>
        </div></section>
        <section className="settings-card"><h3>Timezone and calling preferences</h3><div className="settings-grid">
          <label>Timezone<select value={form.timezone} onChange={change('timezone')}>{timezones.map(zone => <option key={zone}>{zone}</option>)}</select></label>
          <label>Maximum call duration (minutes)<input type="number" required min={1} max={120} value={form.max_call_minutes} onChange={change('max_call_minutes')}/></label>
          <label className="settings-checkbox wide"><input type="checkbox" checked={form.business_hours_enabled} onChange={event => setForm(previous => ({ ...previous, business_hours_enabled: event.target.checked }))}/>Allow new calls only during business hours</label>
          <label>Opening time<input type="time" required value={form.business_start} onChange={change('business_start')}/></label><label>Closing time<input type="time" required value={form.business_end} onChange={change('business_end')}/></label>
          <div className="settings-days wide"><span>Business days</span>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => <label key={day}><input type="checkbox" checked={form.business_days.includes(index)} onChange={event => setForm(previous => ({ ...previous, business_days: event.target.checked ? [...previous.business_days, index] : previous.business_days.filter(value => value !== index) }))}/>{day}</label>)}</div>
          <label className="wide">Callback preferences<textarea rows={3} maxLength={2000} placeholder="For example: offer callbacks on weekdays after 2 PM." value={form.callback_preferences} onChange={change('callback_preferences')}/></label>
        </div><p className="settings-help">Business hours use the selected timezone and must end on the same day. Duration limits apply to browser calls. Callback preferences guide the assistant; placing phone callbacks requires an outbound provider.</p></section>
      </fieldset>
      {error && <p className="lead-error" role="alert">{error}</p>}{message && <p className="lead-notice" role="status">{message}</p>}
      <div className="settings-actions"><button disabled={saving || !settingsReady}>{saving ? 'Saving…' : 'Save workspace settings'}</button></div>
    </form>
    <form className="settings-card" onSubmit={saveAccount}><h3>Your account</h3><div className="settings-grid">
      <label>Name<input required value={account.name} maxLength={120} onChange={accountChange('name')}/></label><label>Email<input required type="email" maxLength={255} value={account.email} onChange={accountChange('email')}/></label>
      <label>Current password<input required type="password" autoComplete="current-password" value={account.current_password} onChange={accountChange('current_password')}/></label>
      <label>New password (optional)<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={account.password} onChange={accountChange('password')}/></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" required={Boolean(account.password)} value={account.password_confirmation} onChange={accountChange('password_confirmation')}/></label>
    </div><p className="settings-help">A new password must have at least 12 characters. Changing it signs out your other sessions.</p>{accountError && <p className="lead-error" role="alert">{accountError}</p>}{accountMessage && <p className="lead-notice" role="status">{accountMessage}</p>}<div className="settings-actions"><button disabled={accountSaving}>{accountSaving ? 'Updating…' : 'Update account'}</button></div></form>
    <section className="settings-card"><div className="settings-status-heading"><h3>Service status</h3><button type="button" onClick={checkStatus} disabled={checking}>{checking ? 'Checking…' : 'Check connections'}</button></div><dl className="settings-status">{[['Backend', status.backend], ['AI gateway', status.ai], ['OpenAI API key', status.key]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Checking…'}</dd></div>)}</dl><p className="settings-help">The API key stays on the server. A configured key still requires a successful call to verify access.</p></section>
  </section>
}
