import { useEffect, useRef, useState } from 'react'
import './App.css'

const transcript = [
  { speaker: 'AI', time: '00:02', text: 'Hi Maya, this is Ava calling from Northstar. Is now a good time for a quick conversation?' },
  { speaker: 'Maya', time: '00:07', text: 'Hi Ava. Yes, I have a few minutes.' },
  { speaker: 'AI', time: '00:11', text: 'Wonderful. I’m reaching out because you recently asked about improving response times for your sales team.' },
  { speaker: 'Maya', time: '00:18', text: 'That’s right. We’re currently evaluating options for our support desk.' },
]

const calls = [
  { initials: 'OL', name: 'Owen Lee', company: 'Plane Studio', time: 'Today, 10:42 AM', duration: '3m 12s', status: 'Qualified' },
  { initials: 'PS', name: 'Priya Shah', company: 'Vertex Labs', time: 'Yesterday, 4:18 PM', duration: '1m 48s', status: 'Callback' },
  { initials: 'JB', name: 'Jon Bell', company: 'Fieldwork', time: 'Yesterday, 11:05 AM', duration: '0m 34s', status: 'No answer' },
]

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92z"/>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.09A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3h4v.09A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.96 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15z"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    mute: <><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6m0-6 6 6"/></>,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>,
    note: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [active, setActive] = useState(true)
  const [seconds, setSeconds] = useState(24)
  const [muted, setMuted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [notice, setNotice] = useState('')
  const timer = useRef(null)

  useEffect(() => {
    if (active && !paused) timer.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer.current)
  }, [active, paused])

  const duration = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const flash = (message) => { setNotice(message); setTimeout(() => setNotice(''), 2200) }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><i></i><i></i><i></i></span><span>Voxa</span></div>
        <nav aria-label="Main navigation">
          <button><Icon name="grid"/><span>Overview</span></button>
          <button className="active"><Icon name="phone"/><span>Calls</span><b>4</b></button>
          <button><Icon name="users"/><span>Contacts</span></button>
          <button><Icon name="chart"/><span>Insights</span></button>
        </nav>
        <div className="sidebar-foot">
          <button><Icon name="settings"/><span>Settings</span></button>
          <div className="user-card"><div className="avatar small">AN</div><div><strong>Alex Nguyen</strong><span>Demo workspace</span></div><Icon name="more"/></div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div><p className="eyebrow">Workspace / Calls</p><h1>AI calling desk</h1></div>
          <div className="header-actions">
            <label className="search"><Icon name="search" size={17}/><input aria-label="Search calls" placeholder="Search calls"/><kbd>⌘ K</kbd></label>
            <button className="new-call" onClick={() => flash('New call setup opened')}><Icon name="plus" size={17}/> New call</button>
          </div>
        </header>

        <section className="workspace">
          <div className="call-panel">
            <div className="panel-heading">
              <div><span className={`live-dot ${active ? '' : 'ended'}`}></span>{active ? (paused ? 'CALL PAUSED' : 'LIVE CALL') : 'CALL ENDED'}</div>
              <button aria-label="More call options"><Icon name="more"/></button>
            </div>
            <div className="call-stage">
              <div className="contact-avatar">MR<span className="signal"><i></i><i></i><i></i></span></div>
              <h2>Maya Rodriguez</h2><p>Head of Operations · Meridian Health</p>
              <div className="timer">{duration}</div>
              <div className="wave" aria-label="Audio activity">{[8,15,24,12,31,19,39,27,16,34,22,10,29,18,36,24,13,28,18,9,21,14,7].map((h,i)=><span key={i} style={{height: active && !paused ? h : 4}}></span>)}</div>
              <div className="call-controls">
                <button className={muted ? 'selected' : ''} onClick={() => setMuted(!muted)}><span><Icon name="mute"/></span>{muted ? 'Unmute' : 'Mute'}</button>
                <button className={paused ? 'selected' : ''} onClick={() => setPaused(!paused)} disabled={!active}><span><Icon name="pause"/></span>{paused ? 'Resume' : 'Hold'}</button>
                <button onClick={() => flash('Note marker added')}><span><Icon name="note"/></span>Add note</button>
                <button className="end" onClick={() => { setActive(false); setPaused(false); flash('Call ended and ready to save') }} disabled={!active}><span><Icon name="phone"/></span>End</button>
              </div>
            </div>
            <div className="lead-context"><div><span>CALL OBJECTIVE</span><strong>Qualify interest and book a product demo</strong></div><div><span>AI AGENT</span><strong>Ava · Sales concierge</strong></div><div><span>PHONE</span><strong>+1 (415) 555-0182</strong></div></div>
          </div>

          <aside className="transcript-panel">
            <div className="transcript-head"><div><h3>Live transcript</h3><p>AI-generated in real time</p></div><span className="language">EN</span></div>
            <div className="transcript-list">
              {transcript.map((line, index) => <div className="message" key={index}><div className={`speaker ${line.speaker === 'AI' ? 'ai' : ''}`}>{line.speaker === 'AI' ? 'A' : 'MR'}</div><div><div className="message-meta"><strong>{line.speaker === 'AI' ? 'Ava · AI' : line.speaker}</strong><span>{line.time}</span></div><p>{line.text}</p></div></div>)}
              <div className="listening"><span></span><span></span><span></span> Ava is listening</div>
            </div>
            <div className="call-note"><Icon name="note" size={17}/><input aria-label="Add a note" placeholder="Type a note about this call..."/><button onClick={() => flash('Note saved')}>Save</button></div>
          </aside>
        </section>

        <section className="recent">
          <div className="section-title"><div><h2>Recent calls</h2><p>Latest conversations from your AI agent</p></div><button>View all <Icon name="chevron" size={16}/></button></div>
          <div className="call-table" role="table"><div className="table-row table-head" role="row"><span>CONTACT</span><span>DATE & TIME</span><span>DURATION</span><span>OUTCOME</span><span></span></div>
            {calls.map((call) => <div className="table-row" role="row" key={call.name}><div className="contact-cell"><div className="avatar">{call.initials}</div><div><strong>{call.name}</strong><small>{call.company}</small></div></div><span>{call.time}</span><span>{call.duration}</span><span><em className={`status ${call.status.toLowerCase().replace(' ', '-')}`}>{call.status}</em></span><button aria-label={`View ${call.name} call`}><Icon name="chevron" size={17}/></button></div>)}
          </div>
        </section>
      </main>
      {notice && <div className="toast">{notice}</div>}
    </div>
  )
}

export default App
