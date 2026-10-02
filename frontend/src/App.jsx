import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import './Call.css'
import './Login.css'
import Leads from './Leads.jsx'
import Calendar from './Calendar.jsx'
import Dashboard from './Dashboard.jsx'
import { TIMEZONE, parseTimestamp, setTimezone } from './time.js'
import Settings from './Settings.jsx'
import { defaultSettings, settingsRequest, withinBusinessHours } from './settings.js'

function Icon({ name, size = 18 }) {
  const paths = {
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92z"/>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.09A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3h4v.09A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.96 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15z"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    mute: <><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6m0-6 6 6"/></>,
    note: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h3"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const apiBase = import.meta.env.PROD ? '/ai' : ''
const recordsBase = ''
const tokenKey = 'voxa_admin_token'
const browserTimezone = () => {
  return TIMEZONE
}
const assistants = {
  deblina: { name: 'Deblina', voice: 'Female voice' },
  subrata: { name: 'Subrata', voice: 'Male voice' },
}

async function recordsRequest(path, options = {}) {
  const response = await fetch(`${recordsBase}/api/call-records${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${sessionStorage.getItem(tokenKey) || ''}`, ...options.headers },
  })
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Call records API returned ${contentType || 'an unknown response type'} from ${response.url} (HTTP ${response.status}). Open the app at http://localhost:5173 and check that Laravel is running on port 8000.`)
  }
  const result = await response.json().catch(() => { throw new Error(`Call records API returned invalid JSON from ${response.url} (HTTP ${response.status}).`) })
  if (!response.ok) {
    throw new Error(result.message || `Call records API failed (HTTP ${response.status}).`)
  }
  return result
}

async function authRequest(path, options = {}) {
  const response = await fetch(`${recordsBase}/api/admin/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(sessionStorage.getItem(tokenKey) ? { Authorization: `Bearer ${sessionStorage.getItem(tokenKey)}` } : {}) },
  })
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new Error(`The login API did not return JSON (HTTP ${response.status}). Check the server routing for /api/admin to Laravel.`)
  }
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || `Authentication failed (HTTP ${response.status}).`)
  return result
}

function Login({ onLogin }) {
  const [branding, setBranding] = useState({ business_name: '', logo_url: '' })
  const [logoFailed, setLogoFailed] = useState(false)
  useEffect(() => {
    document.title = `${branding.business_name || 'Voxa'} - Sign in`
  }, [branding.business_name])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/branding', { headers: { Accept: 'application/json' }, signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Branding unavailable'); return response.json() })
      .then(setBranding)
      .catch(() => { /* Use the default brand if the service is unavailable. */ })
    return () => controller.abort()
  }, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await authRequest('login', { method: 'POST', body: JSON.stringify({ email, password }) })
      sessionStorage.setItem(tokenKey, result.token)
      onLogin(result.admin)
    } catch (loginError) { setError(loginError.message) }
    finally { setLoading(false) }
  }
  return <main className="login-page"><form className="login-card" onSubmit={submit}>
    <div className="brand login-brand">{branding.logo_url && !logoFailed ? <img className="login-company-logo" src={branding.logo_url} alt={`${branding.business_name || 'Company'} logo`} onError={() => setLogoFailed(true)} /> : <span className="brand-mark"><i></i><i></i><i></i></span>}<span className="login-company-name">{branding.business_name || 'Voxa'}</span></div>
    <p className="eyebrow">ADMIN WORKSPACE</p><h1>Sign in to start calls</h1>
    <p className="login-help">Use your admin account to access the calling desk.</p>
    <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {error && <p className="login-error" role="alert">{error}</p>}
    <button type="submit" disabled={loading} aria-busy={loading}>{loading && <span className="login-spinner" aria-hidden="true"/>}<span>{loading ? 'Signing in...' : 'Sign in'}</span></button>
  </form></main>
}

function formatDate(value) {
  return value ? parseTimestamp(value).toLocaleString('en-IN', { timeZone: TIMEZONE }) : 'â€”'
}

function formatDuration(call) {
  if (!call.started_at || !call.ended_at) return 'â€”'
  const seconds = Math.max(0, Math.round((parseTimestamp(call.ended_at) - parseTimestamp(call.started_at)) / 1000))
  return `${Math.floor(seconds)}s`
}

function waitForIceGathering(peerConnection) {
  if (peerConnection.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const timeout = window.setTimeout(done, 3000)
    function done() {
      window.clearTimeout(timeout)
      peerConnection.removeEventListener('icegatheringstatechange', checkState)
      resolve()
    }
    function checkState() {
      if (peerConnection.iceGatheringState === 'complete') done()
    }
    peerConnection.addEventListener('icegatheringstatechange', checkState)
  })
}

function App() {
  const [admin, setAdmin] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const [preferences, setPreferences] = useState(defaultSettings)
  const [settingsReady, setSettingsReady] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsReload, setSettingsReload] = useState(0)
  const adminId = admin?.id
  useEffect(() => {
    if (adminId) document.title = `${preferences.business_name || 'Voxa'} - ${page === 'lead-form' ? 'Add business' : page === 'businesses' ? 'All businesses' : page === 'recordings' ? 'Call Recordings' : page.charAt(0).toUpperCase() + page.slice(1)}`
  }, [adminId, preferences.business_name, page])
  const [leadName, setLeadName] = useState('Laptop test lead')
  const [selectedAssistant, setSelectedAssistant] = useState('deblina')
  const [activeAssistant, setActiveAssistant] = useState('deblina')
  const [callRecords, setCallRecords] = useState([])
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [recordsError, setRecordsError] = useState('')
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [calendarRefresh, setCalendarRefresh] = useState(0)
  const [noteText, setNoteText] = useState('')
  const [callState, setCallState] = useState('idle')
  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState([])
  const peerRef = useRef(null)
  const streamRef = useRef(null)
  const channelRef = useRef(null)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const endTimerRef = useRef(null)
  const durationTimerRef = useRef(null)
  const recordIdRef = useRef(null)
  const transcriptRef = useRef([])
  const writeQueueRef = useRef(Promise.resolve())
  const extractionQueueRef = useRef(Promise.resolve())
  const finishingRef = useRef(false)
  const startingRef = useRef(false)

  useEffect(() => {
    if (!sessionStorage.getItem(tokenKey)) { setCheckingAuth(false); return }
    authRequest('me').then(setAdmin).catch(() => sessionStorage.removeItem(tokenKey)).finally(() => setCheckingAuth(false))
  }, [])

  const logout = async () => {
    if (busy || connected) return
    try { await authRequest('logout', { method: 'POST' }) } catch { /* Clear this browser session anyway. */ }
    sessionStorage.removeItem(tokenKey)
    setAdmin(null)
    setSettingsReady(false)
    setPreferences(defaultSettings)
    setTimezone(defaultSettings.timezone)
  }

  const connected = callState === 'connected'
  const busy = ['requesting-microphone', 'connecting', 'ending'].includes(callState)
  const shownAssistant = busy || connected ? activeAssistant : selectedAssistant

  const flash = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const records = await recordsRequest('')
      setCallRecords(records)
      setRecordsError('')
    } catch (loadError) {
      setRecordsError(`${loadError.message} Start Laravel on port 8000 and check its database.`)
    } finally {
      setRecordsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!admin) return
    recordsRequest('')
      .then((records) => { setCallRecords(records); setRecordsError('') })
      .catch((loadError) => setRecordsError(`${loadError.message} Start Laravel on port 8000 and check its database.`))
  }, [admin])

  useEffect(() => {
    if (!adminId) return
    let active = true
    settingsRequest('settings').then(result => {
      if (!active) return
      setTimezone(result.timezone)
      setPreferences(result)
      setSelectedAssistant(result.default_assistant)
      setSettingsReady(true)
      setSettingsError('')
    }).catch(reason => { if (active) { setSettingsReady(false); setSettingsError(reason.message) } })
    return () => { active = false }
  }, [adminId, settingsReload])

  const savePreferences = result => {
    setTimezone(result.timezone)
    setPreferences(result)
    setSelectedAssistant(result.default_assistant)
  }

  const openRecord = async (id) => {
    setRecordsError('')
    try {
      setSelectedRecord(await recordsRequest(`/${id}`))
    } catch (loadError) {
      setRecordsError(`Could not load call details: ${loadError.message}`)
    }
  }

  const queueRecordWrite = useCallback((path, options) => {
    writeQueueRef.current = writeQueueRef.current
      .catch(() => {})
      .then(() => recordsRequest(path, options))
      .catch((writeError) => {
        setRecordsError(`A call record could not be saved: ${writeError.message}`)
        throw writeError
      })
    return writeQueueRef.current
  }, [])

  const releaseCall = useCallback((finalState = 'ended') => {
    window.clearInterval(timerRef.current)
    window.clearTimeout(endTimerRef.current)
    window.clearTimeout(durationTimerRef.current)
    timerRef.current = null
    endTimerRef.current = null
    channelRef.current?.close()
    peerRef.current?.close()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (audioRef.current) audioRef.current.srcObject = null
    channelRef.current = null
    peerRef.current = null
    streamRef.current = null
    setMuted(false)
    setCallState(finalState)
  }, [])

  useEffect(() => () => releaseCall('idle'), [releaseCall])

  const finishCall = useCallback(async (finalState = 'ended', finalError = '') => {
    if (finishingRef.current) return
    finishingRef.current = true
    const callId = recordIdRef.current
    const lines = transcriptRef.current
    const hadConversation = lines.some((line) => line.speaker === 'AI') &&
      lines.some((line) => line.speaker === 'You')
    const completed = finalState !== 'error' || hadConversation
    releaseCall(completed ? 'ended' : 'error')
    if (finalError && !completed) setError(finalError)
    if (callId) {
      const summary = lines.length
        ? `Browser test call with ${lines.length} transcript message${lines.length === 1 ? '' : 's'}.`
        : 'Browser test call ended without a transcript.'
      try {
        await queueRecordWrite(`/${callId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: completed ? 'completed' : 'failed',
            outcome: completed ? 'browser_test' : 'connection_error',
            summary,
          }),
        })
        await loadRecords()
      } catch { /* The visible records error explains the failed save. */ }
    }
    recordIdRef.current = null
  }, [loadRecords, queueRecordWrite, releaseCall])

  const appendTranscript = useCallback((speaker, text) => {
    const cleanText = text?.trim()
    if (!cleanText) return
    const line = {
      id: `${Date.now()}-${Math.random()}`,
      speaker,
      text: cleanText,
      time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
    }
    transcriptRef.current.push(line)
    setTranscript((items) => [...items, line])
    if (recordIdRef.current) {
      const callId = recordIdRef.current
      queueRecordWrite(`/${recordIdRef.current}/messages`, {
        method: 'POST',
        body: JSON.stringify({ speaker: speaker === 'AI' ? 'ai' : 'customer', message: cleanText }),
      }).catch(() => {})
      if (speaker === 'You' || speaker === 'AI') {
        const lines = transcriptRef.current.slice(-30).map((item) => `${item.speaker}: ${item.text}`)
        extractionQueueRef.current = extractionQueueRef.current.catch(() => {}).then(async () => {
          const response = await fetch(`${apiBase}/api/schedule/extract`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: lines, timezone: browserTimezone(), now: new Date().toISOString() }),
          })
          if (!response.ok) throw new Error('Schedule extraction failed')
          const { events = [] } = await response.json()
          for (const event of events) {
            const startsAt = new Date(event.starts_at)
            if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date()) continue
            if (!['meeting', 'interview', 'call_reminder', 'other'].includes(event.event_type) || !event.title) continue
            await recordsRequest(`/${callId}/schedule-events`, {
              method: 'POST', body: JSON.stringify({ event_type: event.event_type, title: event.title, details: event.details || '', starts_at: startsAt.toISOString(), timezone: browserTimezone() }),
            })
            setCalendarRefresh((value) => value + 1)
          }
        }).catch(() => setRecordsError('A schedule could not be extracted or saved from the call.'))
      }
    }
  }, [queueRecordWrite])

  const handleRealtimeEvent = useCallback((event) => {
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      appendTranscript('You', event.transcript)
    }
    if (['response.output_audio_transcript.done', 'response.audio_transcript.done'].includes(event.type)) {
      appendTranscript('AI', event.transcript)
    }
    if (event.type === 'error') {
      finishCall('error', event.error?.message || 'The realtime session reported an error.')
    }
    if (event.type === 'session.closed') finishCall('ended')
  }, [appendTranscript, finishCall])

  const startCall = async () => {
    if (startingRef.current || busy || connected) return
    if (!settingsReady) { setError(settingsError || 'Workspace settings are still loading. Please try again shortly.'); return }
    if (!withinBusinessHours(preferences)) { setError(`Calls can start only during your configured business hours (${preferences.timezone}).`); return }
    const assistantId = selectedAssistant
    startingRef.current = true
    setActiveAssistant(assistantId)
    finishingRef.current = false
    setError('')
    setTranscript([])
    transcriptRef.current = []
    writeQueueRef.current = Promise.resolve()
    extractionQueueRef.current = Promise.resolve()
    recordIdRef.current = null
    setSeconds(0)
    setCallState('requesting-microphone')

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        throw new Error('This browser does not support microphone WebRTC calls.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream
      setCallState('connecting')

      const record = await recordsRequest('', {
        method: 'POST',
        body: JSON.stringify({ lead_name: leadName.trim() || 'Laptop test lead', assistant_name: assistants[assistantId].name, timezone: browserTimezone() }),
      })
      recordIdRef.current = record.id
      loadRecords()

      const peer = new RTCPeerConnection()
      peerRef.current = peer
      stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream))

      const audio = new Audio()
      audio.autoplay = true
      audioRef.current = audio
      peer.ontrack = ({ streams }) => {
        audio.srcObject = streams[0]
        audio.play().catch(() => setError('Allow audio playback to hear the AI.'))
      }
      peer.onconnectionstatechange = () => {
        if (['failed', 'disconnected'].includes(peer.connectionState)) {
          finishCall('error', 'The voice connection was lost.')
        }
      }

      const channel = peer.createDataChannel('oai-events')
      channelRef.current = channel
      channel.addEventListener('message', ({ data }) => {
        try { handleRealtimeEvent(JSON.parse(data)) } catch { /* Ignore malformed events. */ }
      })
      channel.addEventListener('open', () => {
        setCallState('connected')
        queueRecordWrite(`/${recordIdRef.current}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'in_progress' }),
        }).catch(() => {})
        timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000)
        durationTimerRef.current = window.setTimeout(() => { flash('Call ended at the configured duration limit.'); finishCall('ended') }, preferences.max_call_minutes * 60000)
        channel.send(JSON.stringify({
          type: 'session.update',
          session: { type: 'realtime', instructions: [
            `You are ${assistants[assistantId].name}, a concise and friendly AI calling assistant. Speak ${preferences.language}.`,
            'Do not repeat your opening greeting. Ask one question at a time, do not invent facts, and stop when interrupted. Confirm the date, time and timezone of meetings and reminders; confirmed plans appear in the workspace Calendar.',
            `Use ${preferences.timezone} for times unless the customer specifies otherwise.`,
            preferences.business_name ? `You assist ${preferences.business_name}.` : '',
            preferences.instructions,
            preferences.callback_preferences ? `Callback preferences: ${preferences.callback_preferences}` : '',
          ].filter(Boolean).join('\n') },
        }))
        channel.send(JSON.stringify({
          type: 'response.create',
          response: { instructions: `Speak ${preferences.language}. Introduce yourself as ${assistants[assistantId].name} and disclose that you are an AI assistant in a browser test conversation. Then use this greeting: ${preferences.greeting}. Say the disclosure only in this opening message.` },
        }))
      })

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      await waitForIceGathering(peer)

      const response = await fetch(`${apiBase}/api/realtime/session?assistant=${assistantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: peer.localDescription.sdp,
      })
      if (!response.ok) {
        let message = 'The AI service could not start the call.'
        try { message = (await response.json()).detail || message } catch { /* Use safe fallback. */ }
        throw new Error(message)
      }

      await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() })
    } catch (startError) {
      const message = startError.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow it in the browser and try again.'
        : startError.message || 'The call could not be started.'
      await finishCall('error', message)
    } finally {
      startingRef.current = false
    }
  }

  const endCall = () => {
    if (!peerRef.current) return
    setCallState('ending')
    if (channelRef.current?.readyState === 'open') {
      channelRef.current.send(JSON.stringify({ type: 'session.close' }))
      endTimerRef.current = window.setTimeout(() => finishCall('ended'), 1500)
    } else {
      finishCall('ended')
    }
  }

  const toggleMute = () => {
    const nextMuted = !muted
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted })
    setMuted(nextMuted)
  }

  const saveNote = async () => {
    const message = noteText.trim()
    if (!message || !recordIdRef.current) return
    try {
      await queueRecordWrite(`/${recordIdRef.current}/messages`, {
        method: 'POST',
        body: JSON.stringify({ speaker: 'system', message }),
      })
      setNoteText('')
      flash('Note saved to this call')
    } catch { /* The visible records error explains the failed save. */ }
  }

  const duration = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const statusLabel = {
    idle: 'READY TO CALL',
    'requesting-microphone': 'REQUESTING MICROPHONE',
    connecting: 'CONNECTING',
    connected: 'LIVE AI CALL',
    ending: 'ENDING CALL',
    ended: 'CALL ENDED',
    error: 'CALL ERROR',
  }[callState]

  if (checkingAuth) return <main className="login-page"><div className="login-session-loading" role="status"><span className="login-spinner" aria-hidden="true"/>Checking session...</div></main>
  if (!admin) return <Login onLogin={(user) => { setSettingsReady(false); setPage('dashboard'); setAdmin(user) }} />

  const pageTitle = { dashboard: 'Dashboard', calls: 'AI calling desk', recordings: 'Call Recordings', calendar: 'Calendar', 'lead-form': 'Add business', businesses: 'All businesses', settings: 'Settings' }[page]

  return (
    <div className="app-shell">
      <aside className={`sidebar${menuOpen ? ' mobile-menu-open' : ''}`} onKeyDown={(event) => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButtonRef.current?.focus() } }}>
        <div className="brand">{preferences.logo_url ? <img src={preferences.logo_url} alt="Business logo" style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 6 }} /> : <span className="brand-mark"><i></i><i></i><i></i></span>}<span title={preferences.business_name || 'Voxa'} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preferences.business_name || 'Voxa'}</span></div>
        <button className="mobile-menu-toggle" ref={menuButtonRef} aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(open => !open)}><Icon name={menuOpen ? 'close' : 'menu'} size={24}/></button>
        <nav id="main-navigation" aria-label="Main navigation" onClick={(event) => { if (event.target.closest('button')) { setMenuOpen(false); menuButtonRef.current?.focus() } }}>
          <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}><Icon name="grid"/><span>Dashboard</span></button>
          <button className={page === 'calls' ? 'active' : ''} onClick={() => setPage('calls')}><Icon name="phone"/><span>Calls</span></button>
          <button className={page === 'recordings' ? 'active' : ''} onClick={() => { setPage('recordings'); setSelectedRecord(null); loadRecords() }}><Icon name="note"/><span>Call Recordings</span></button>
          <button className={page === 'calendar' ? 'active' : ''} onClick={() => setPage('calendar')}><Icon name="calendar"/><span>Calendar</span></button>
          <button className={page === 'lead-form' ? 'active' : ''} onClick={() => setPage('lead-form')}><Icon name="plus"/><span>Add business</span></button>
          <button className={page === 'businesses' ? 'active' : ''} onClick={() => setPage('businesses')}><Icon name="users"/><span>All businesses</span></button>
          <button onClick={() => setPage('dashboard')}><Icon name="chart"/><span>Insights</span></button>
          <button className={`mobile-settings-link${page === 'settings' ? ' active' : ''}`} onClick={() => setPage('settings')}><Icon name="settings"/><span>Settings</span></button>
        </nav>
        <div className="sidebar-foot">
          <button className={page === 'settings' ? 'active' : ''} onClick={() => setPage('settings')}><Icon name="settings"/><span>Settings</span></button>
          <div className="user-card"><div className="avatar small">{admin.name.slice(0, 2).toUpperCase()}</div><div><strong>{admin.name}</strong><span>{admin.email}</span></div></div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div><p className="eyebrow">{preferences.business_name || 'Voxa'} / {pageTitle}</p><h1>{pageTitle}</h1></div>
          <div className="header-actions">
            {page === 'calls' && <>
              <label className="search"><Icon name="search" size={17}/><input aria-label="Search calls" placeholder="Search calls"/><kbd>Ctrl K</kbd></label>
              <button className="new-call" onClick={startCall} disabled={busy || connected}><Icon name="plus" size={17}/> Start AI call</button>
            </>}
            <button className="header-logout" onClick={logout} disabled={busy || connected}>Sign out</button>
          </div>
        </header>

        {page === 'settings' ? settingsReady ? <Settings key={admin.id} preferences={preferences} onSaved={savePreferences} admin={admin} onAccountSaved={setAdmin} settingsReady={settingsReady} settingsError={settingsError} /> : <section className="settings-page"><p role="status">{settingsError || 'Loading workspace settingsâ€¦'}</p>{settingsError && <button onClick={() => { setSettingsError(''); setSettingsReload(value => value + 1) }}>Retry loading settings</button>}</section> : page === 'dashboard' ? <Dashboard key={preferences.timezone} onNavigate={(next) => { setPage(next); if (next === 'recordings') { setSelectedRecord(null); loadRecords() } }} onOpenRecord={(id) => { setPage('recordings'); openRecord(id) }} /> : (page === 'lead-form' || page === 'businesses') ? <Leads page={page} onNavigate={setPage} /> : page === 'calendar' ? <Calendar key={preferences.timezone} refreshKey={calendarRefresh} /> : page === 'calls' ? <>
        <section className="workspace">
          <div className="call-panel">
            <div className="panel-heading">
              <div><span className={`live-dot ${connected ? '' : 'ended'}`}></span>{statusLabel}</div>
              <button aria-label="More call options"><Icon name="more"/></button>
            </div>
            <div className="call-stage">
              <div className="contact-avatar">AI<span className="signal"><i></i><i></i><i></i></span></div>
              <h2>{assistants[shownAssistant].name}</h2><p>OpenAI realtime voice prototype</p>
              {!connected && !busy && <fieldset className="assistant-picker"><legend>Choose your AI assistant</legend><div className="assistant-options">{Object.entries(assistants).map(([id, assistant]) => <label className={selectedAssistant === id ? 'selected' : ''} key={id}><input type="radio" name="assistant" value={id} checked={selectedAssistant === id} onChange={() => setSelectedAssistant(id)}/><span><strong>{assistant.name}</strong><small>{assistant.voice}</small></span></label>)}</div></fieldset>}
              {!connected && !busy && <label className="lead-name-label">Test lead name<input value={leadName} maxLength={120} onChange={(event) => setLeadName(event.target.value)} /></label>}
              <div className="timer">{duration}</div>
              <div className="wave" aria-label="Audio activity">{[8,15,24,12,31,19,39,27,16,34,22,10,29,18,36,24,13,28,18,9,21,14,7].map((height, index) => <span key={index} style={{height: connected && !muted ? height : 4}}></span>)}</div>
              {error && <div className="call-error" role="alert">{error}</div>}
              <div className="call-controls">
                {!connected && !busy && <button className="start-control" onClick={startCall}><span><Icon name="phone"/></span>Start</button>}
                <button className={muted ? 'selected' : ''} onClick={toggleMute} disabled={!connected}><span><Icon name="mute"/></span>{muted ? 'Unmute' : 'Mute'}</button>
                <button onClick={() => document.getElementById('call-note')?.focus()} disabled={!connected}><span><Icon name="note"/></span>Add note</button>
                <button className="end" onClick={endCall} disabled={!connected}><span><Icon name="phone"/></span>End</button>
              </div>
            </div>
            <div className="lead-context"><div><span>CALL OBJECTIVE</span><strong>Validate a natural laptop voice conversation</strong></div><div><span>AI AGENT</span><strong>{assistants[shownAssistant].name} Â· Prototype</strong></div><div><span>CHANNEL</span><strong>Browser microphone</strong></div></div>
          </div>

          <aside className="transcript-panel">
            <div className="transcript-head"><div><h3>Live transcript</h3><p>Generated during this call</p></div><span className="language">EN</span></div>
            <div className="transcript-list" aria-live="polite">
              {transcript.length === 0 && <div className="empty-transcript">Start a call and allow microphone access. Your conversation will appear here.</div>}
              {transcript.map((line) => <div className="message" key={line.id}><div className={`speaker ${line.speaker === 'AI' ? 'ai' : ''}`}>{line.speaker === 'AI' ? activeAssistant[0].toUpperCase() : 'Y'}</div><div><div className="message-meta"><strong>{line.speaker === 'AI' ? `${assistants[activeAssistant].name} Â· AI` : 'You'}</strong><span>{line.time}</span></div><p>{line.text}</p></div></div>)}
              {connected && <div className="listening"><span></span><span></span><span></span>{muted ? ' Microphone muted' : ' Listening'}</div>}
            </div>
            <div className="call-note"><Icon name="note" size={17}/><input id="call-note" aria-label="Add a note" placeholder="Type a note about this call" value={noteText} maxLength={10000} onChange={(event) => setNoteText(event.target.value)} disabled={!connected}/><button onClick={saveNote} disabled={!connected || !noteText.trim()}>Save</button></div>
          </aside>
        </section>

        <section className="recent">
          <div className="section-title"><div><h2>Recent calls</h2><p>Saved from your browser test calls</p></div><button onClick={() => { setPage('recordings'); loadRecords() }}>View all <Icon name="chevron" size={16}/></button></div>
          {recordsError && <p className="records-error" role="alert">{recordsError}</p>}
          <div className="call-table" role="table"><div className="table-row table-head" role="row"><span>CONTACT</span><span>DATE & TIME</span><span>DURATION</span><span>OUTCOME</span><span></span></div>
            {callRecords.length === 0 && <div className="records-empty">No calls saved yet.</div>}
            {callRecords.slice(0, 5).map((call) => <div className="table-row" role="row" key={call.id}><div className="contact-cell"><div className="avatar">{call.lead_name.slice(0, 2).toUpperCase()}</div><div><strong>{call.lead_name}</strong><small>{call.assistant_name} Â· Browser call #{call.id}</small></div></div><span>{formatDate(call.created_at)}</span><span>{formatDuration(call)}</span><span><em className={`status ${call.status}`}>{call.status}</em></span><button aria-label={`View call ${call.id}`} onClick={() => { setPage('recordings'); openRecord(call.id) }}><Icon name="chevron" size={17}/></button></div>)}
          </div>
        </section>
        </> : <section className="recordings-page">
          <div className="recordings-heading"><div><h2>Saved call records</h2><p>Call details and transcripts from the database. Audio files are not stored.</p></div><button onClick={loadRecords} disabled={recordsLoading}>{recordsLoading ? 'Loadingâ€¦' : 'Refresh'}</button></div>
          {recordsError && <p className="records-error" role="alert">{recordsError}</p>}
          {selectedRecord ? <div className="record-detail">
            <button className="back-records" onClick={() => setSelectedRecord(null)}>â† Back to call records</button>
            <div className="record-detail-head"><div><h2>{selectedRecord.lead_name}</h2><p>Call #{selectedRecord.id} Â· {formatDate(selectedRecord.created_at)}</p></div><em className={`status ${selectedRecord.status}`}>{selectedRecord.status}</em></div>
            <div className="record-facts"><div><span>Assistant</span><strong>{selectedRecord.assistant_name}</strong></div><div><span>Duration</span><strong>{formatDuration(selectedRecord)}</strong></div><div><span>Outcome</span><strong>{selectedRecord.outcome || 'â€”'}</strong></div></div>
            <h3>Summary</h3><p>{selectedRecord.summary || 'No summary available yet.'}</p>
            <h3>Transcript and notes</h3>
            {selectedRecord.messages.length === 0 ? <p>No transcript messages were saved for this call.</p> : <div className="record-messages">{selectedRecord.messages.map((message) => <div className="record-message" key={message.id}><strong>{message.speaker === 'customer' ? 'You' : message.speaker === 'ai' ? `${selectedRecord.assistant_name} Â· AI` : 'Note'}</strong><small>{formatDate(message.spoken_at)}</small><p>{message.message}</p></div>)}</div>}
          </div> : <div className="recordings-table">
            <div className="recordings-row recordings-header"><span>LEAD</span><span>DATE</span><span>DURATION</span><span>STATUS</span><span></span></div>
            {callRecords.length === 0 && <div className="records-empty">No call records yet. Start a test call to create one.</div>}
            {callRecords.map((call) => <div className="recordings-row" key={call.id}><div><strong>{call.lead_name}</strong><small>{call.assistant_name} Â· Call #{call.id}</small></div><span>{formatDate(call.created_at)}</span><span>{formatDuration(call)}</span><em className={`status ${call.status}`}>{call.status}</em><button onClick={() => openRecord(call.id)}>View details</button></div>)}
          </div>}
        </section>}
      </main>
      {notice && <div className="toast">{notice}</div>}
    </div>
  )
}

export default App
