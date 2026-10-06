import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ExcelJS from 'exceljs/dist/exceljs.min.js'
import { buildReportCsv, downloadExcel, downloadPdf } from '../src/reportExport.js'

const event = (id, title) => ({ id, event_type: 'meeting', title, starts_at: '2026-10-08 10:00:00', ends_at: '2026-10-08 11:00:00', timezone: 'Asia/Kolkata', status: 'confirmed', contact_name: 'Example Contact', location: 'Online', source: 'ai_call', call_id: 7, details: 'Agenda' })
const report = {
  calls: [], events: 0, meetings: { upcoming: [event(1, 'Upcoming review')], past: [event(2, 'Past review')] },
  days: 30, assistant: 'All assistants', completed: 0, failed: 0, finished: 0, average: 0, totalSeconds: 0,
  trend: [{ label: 'Oct 1', completed: 0, failed: 0, other: 0 }],
  durationBands: [{ label: '< 1 min', count: 0 }],
  heatmap: [[{ day: 'Mon', count: 0 }]], dayParts: ['00-06'], byAssistant: [], duration: () => 0,
}

test('CSV includes upcoming and past meeting rows with schedule fields', () => {
  const csv = buildReportCsv(report)
  assert.match(csv, /"Upcoming meeting","1"/)
  assert.match(csv, /"Past meeting","2"/)
  assert.match(csv, /"Online","ai_call","7"/)
})

test('Excel report includes upcoming and past meeting sheets', async () => {
  let downloaded
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  globalThis.URL.createObjectURL = blob => { downloaded = blob; return 'blob:test' }
  globalThis.URL.revokeObjectURL = () => {}
  globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { append() {} } }
  globalThis.window = { setTimeout() {} }
  try {
    await downloadExcel(report)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(Buffer.from(await downloaded.arrayBuffer()))
    assert.equal(workbook.getWorksheet('Upcoming meetings').getCell('C2').value, 'Upcoming review')
    assert.equal(workbook.getWorksheet('Past meetings').getCell('C2').value, 'Past review')
    assert.equal(workbook.getWorksheet('Overview').getCell('B11').value, 1)
    assert.equal(workbook.getWorksheet('Overview').getCell('B12').value, 1)
  } finally {
    globalThis.URL.createObjectURL = originalCreateObjectURL
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL
    globalThis.document = originalDocument
    globalThis.window = originalWindow
  }
})

test('PDF report creates a page for each meeting group', async () => {
  const path = `call-report-${new Date().toISOString().slice(0, 10)}.pdf`
  try {
    await downloadPdf(report)
    const file = await fs.readFile(path)
    assert.equal(file.subarray(0, 4).toString(), '%PDF')
    assert.equal((file.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 7)
  } finally { await fs.unlink(path).catch(() => {}) }
})
