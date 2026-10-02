export const defaultSettings = {
  business_name: '', contact_email: '', contact_phone: '', logo_url: '',
  default_assistant: 'deblina', language: 'English', greeting: 'Hello! How can I help you today?', instructions: '',
  timezone: 'Asia/Kolkata', business_hours_enabled: false, business_days: [1, 2, 3, 4, 5],
  business_start: '09:00', business_end: '18:00', max_call_minutes: 15, callback_preferences: '',
}
export async function settingsRequest(path, options = {}) {
  const response = await fetch(`/api/admin/${path}`, { signal: AbortSignal.timeout(15000), ...options, headers: {
    Accept: 'application/json', 'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}`,
  } })
  const data = await response.json().catch(() => { throw new Error(`Settings service did not return JSON (HTTP ${response.status}).`) })
  if (!response.ok) throw new Error(Object.values(data.errors || {})[0]?.[0] || data.message || 'Could not save settings.')
  return data
}
export function withinBusinessHours(settings, now = new Date()) {
  if (!settings.business_hours_enabled) return true
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(part => [part.type, part.value]))
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  const time = `${parts.hour}:${parts.minute}`
  return settings.business_days.includes(day) && time >= settings.business_start && time < settings.business_end
}
