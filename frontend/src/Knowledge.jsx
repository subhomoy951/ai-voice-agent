import { useEffect, useRef, useState } from 'react'
import './Knowledge.css'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['pdf', 'docx', 'txt']

async function request(path = '', options = {}) {
  const response = await fetch(`/api/knowledge-documents${path}`, {
    ...options,
    headers: { Accept: 'application/json', Authorization: `Bearer ${sessionStorage.getItem('voxa_admin_token') || ''}`, ...options.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(response.status === 404 ? 'The knowledge API is not available yet.' : Object.values(data.errors || {})[0]?.[0] || data.message || 'Knowledge request failed.')
  return data
}

function validateFile(file) {
  if (!file) throw new Error('Choose a document first.')
  if (!ACCEPTED.includes(file.name.split('.').pop()?.toLowerCase())) throw new Error('Choose a PDF, DOCX, or TXT file.')
  if (file.size > MAX_BYTES) throw new Error('The file must be 10 MB or smaller.')
}

function formatSize(bytes) {
  return bytes == null ? '—' : `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function concisePoints(passages, question) {
  const terms = [...new Set((question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])
    .filter(term => !['what', 'which', 'does', 'with', 'are', 'the', 'and', 'for', 'keyline', 'digitech', 'provide', 'provides', 'services'].includes(term)))]
  const seen = new Set()
  return passages.flatMap(passage => (passage.content || passage.text || '').split(/(?<=[.!?])\s+|\n+/u))
    .map(sentence => sentence.replace(/\s+/g, ' ').trim())
    .filter(sentence => sentence.length >= 25)
    .map(sentence => {
      const short = sentence.length > 160 ? `${sentence.slice(0, 157).replace(/\s+\S*$/, '')}…` : sentence
      const key = short.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 90)
      return { text: short, key, score: terms.reduce((score, term) => score + (short.toLowerCase().includes(term) ? 2 : 0), 0) + (/design|develop|marketing|content|seo|branding|social media|advertis/i.test(short) ? 1 : 0) }
    })
    .filter(point => { if (seen.has(point.key)) return false; seen.add(point.key); return true })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
}

export default function Knowledge() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const fileRef = useRef(null)
  const replaceRef = useRef(null)
  const replacingId = useRef(null)

  const reload = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await request()
      setDocuments(Array.isArray(data) ? data : data.data || [])
    } catch (reason) { setError(reason.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  const upload = async (event) => {
    event.preventDefault()
    try {
      validateFile(file)
      setBusyId('upload'); setError('')
      const body = new FormData()
      body.append('file', file)
      body.append('title', title.trim() || file.name)
      await request('', { method: 'POST', body })
      setTitle(''); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await reload()
    } catch (reason) { setError(reason.message) }
    finally { setBusyId(null) }
  }

  const replace = async (event) => {
    const selected = event.target.files?.[0]
    const id = replacingId.current
    if (!selected || !id) return
    try {
      validateFile(selected)
      setBusyId(id); setError('')
      const body = new FormData()
      body.append('file', selected)
      await request(`/${id}/replace`, { method: 'POST', body })
      await reload()
    } catch (reason) { setError(reason.message) }
    finally { setBusyId(null); replacingId.current = null; event.target.value = '' }
  }

  const remove = async (document) => {
    if (!window.confirm(`Delete “${document.title}” from the knowledge base?`)) return
    try {
      setBusyId(document.id); setError('')
      await request(`/${document.id}`, { method: 'DELETE' })
      setDocuments(items => items.filter(item => item.id !== document.id))
      setResult(null)
    } catch (reason) { setError(reason.message) }
    finally { setBusyId(null) }
  }

  const testQuestion = async (event) => {
    event.preventDefault()
    if (!question.trim()) return
    setTesting(true); setError(''); setResult(null)
    try {
      const data = await request('/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question.trim() }) })
      setResult(data)
    } catch (reason) { setError(reason.message) }
    finally { setTesting(false) }
  }

  const passages = result?.passages || result?.sources || []
  const points = concisePoints(passages, question)
  return <section className="knowledge-page">
    <header className="knowledge-heading"><div><h2>Knowledge base</h2><p>Manage the company documents that AI agents can use to answer caller questions.</p></div><button type="button" onClick={reload} disabled={loading}>Refresh</button></header>
    {error && <p className="knowledge-error" role="alert">{error}</p>}
    <div className="knowledge-layout">
      <div className="knowledge-main">
        <form className="knowledge-panel knowledge-upload" onSubmit={upload}>
          <div><h3>Upload a document</h3><p>PDF, DOCX or TXT · Up to 10 MB. Scanned PDFs need OCR before their text can be used.</p></div>
          <label>Document title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={255} placeholder="Optional; defaults to filename" /></label>
          <label>Choose file<input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={event => setFile(event.target.files?.[0] || null)} /></label>
          <button type="submit" disabled={busyId !== null}>{busyId === 'upload' ? 'Uploading…' : 'Upload document'}</button>
        </form>
        <section className="knowledge-panel" aria-labelledby="knowledge-documents-title">
          <div className="knowledge-panel-head"><h3 id="knowledge-documents-title">Documents</h3><span>{documents.length}</span></div>
          {loading ? <p role="status">Loading documents…</p> : documents.length === 0 ? <p>No documents uploaded yet.</p> : <div className="knowledge-list">{documents.map(document => <article className="knowledge-document" key={document.id}>
            <div><h4>{document.title}</h4><p>{document.original_filename} · {formatSize(document.file_size)}</p><small>Uploaded {document.created_at ? new Date(document.created_at).toLocaleDateString() : '—'}</small></div>
            <div className="knowledge-document-actions"><span className={`knowledge-status knowledge-status-${document.status}`}>{document.status || 'pending'}</span><button type="button" disabled={busyId !== null} onClick={() => { replacingId.current = document.id; replaceRef.current?.click() }}>Replace</button><button type="button" disabled={busyId !== null} onClick={() => remove(document)}>Delete</button></div>
            {document.status === 'failed' && document.error_message && <p className="knowledge-document-error">{document.error_message}</p>}
          </article>)}</div>}
          <input className="knowledge-hidden-input" ref={replaceRef} type="file" accept=".pdf,.docx,.txt" onChange={replace} aria-label="Replacement document" />
        </section>
      </div>
      <form className="knowledge-panel knowledge-test" onSubmit={testQuestion}>
        <h3>Test a question</h3><p>Check which document passages can support an answer before using them in calls.</p>
        <label>Company question<textarea rows={4} value={question} onChange={event => setQuestion(event.target.value)} maxLength={2000} placeholder="Which technologies does the company use to build web applications?" /></label>
        <button type="submit" disabled={testing || !question.trim()}>{testing ? 'Searching…' : 'Find supporting passages'}</button>
        {result && <div className="knowledge-results" aria-live="polite"><h4>Search result</h4>{passages.length ? <><ol className="knowledge-points">{points.map(point => <li key={point.key}>{point.text}</li>)}</ol><details><summary>View source passages</summary>{passages.map((passage, index) => <blockquote key={passage.id || index}><p>{passage.content || passage.text}</p><cite>{passage.document_title || passage.title || 'Company document'}{passage.page_number ? ` · Page ${passage.page_number}` : passage.section ? ` · ${passage.section}` : ''}</cite></blockquote>)}</details></> : <p>No supporting passages found.</p>}</div>}
      </form>
    </div>
  </section>
}
