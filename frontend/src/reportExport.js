import { TIMEZONE, parseTimestamp } from './time.js'

const stamp = () => new Date().toISOString().slice(0, 10)
const localDate = value => parseTimestamp(value).toLocaleString('en-IN', { timeZone: TIMEZONE, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const safeText = value => String(value ?? '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim()
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`

export function buildReportCsv(report) {
  const rows = [
    ['Record type', 'ID', 'Start / date (UTC)', 'End (UTC)', 'Timezone', 'Title', 'Contact', 'Assistant', 'Status', 'Duration seconds', 'Outcome / details', 'Meeting type', 'Location', 'Source', 'Linked call ID'],
    ...report.calls.map(call => ['Call', call.id, call.created_at, '', call.timezone || TIMEZONE, '', call.lead_name, call.assistant_name, call.status, report.duration(call), call.outcome, '', '', '', call.id]),
    ...report.meetings.upcoming.map(event => ['Upcoming meeting', event.id, event.starts_at, event.ends_at, event.timezone || TIMEZONE, event.title, event.contact_name || event.lead_name, event.call_assistant_name, event.status || 'confirmed', '', event.details, event.event_type, event.location, event.source, event.call_id]),
    ...report.meetings.past.map(event => ['Past meeting', event.id, event.starts_at, event.ends_at, event.timezone || TIMEZONE, event.title, event.contact_name || event.lead_name, event.call_assistant_name, event.status || 'confirmed', '', event.details, event.event_type, event.location, event.source, event.call_id]),
  ]
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}
const download = (blob, name) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadExcel(report) {
  const module = await import('exceljs/dist/exceljs.min.js')
  const ExcelJS = module.default || module
  const book = new ExcelJS.Workbook()
  book.creator = 'Voxa Reports'
  book.created = new Date()
  const navy = '173149'
  const teal = '28776A'
  const header = sheet => {
    const row = sheet.getRow(1)
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${navy}` } }
    row.height = 27
    row.alignment = { vertical: 'middle' }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }
  const styleData = sheet => {
    for (let index = 2; index <= sheet.rowCount; index++) {
      const row = sheet.getRow(index)
      row.height = 22
      if (index % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F7F6' } }
      row.alignment = { vertical: 'middle' }
    }
  }

  const summary = book.addWorksheet('Overview')
  summary.columns = [{ header: 'REPORT METRIC', key: 'metric', width: 32 }, { header: 'VALUE', key: 'value', width: 24 }, { header: 'DETAIL', key: 'detail', width: 58 }]
  summary.addRows([
    ['Period', `Last ${report.days} days`, `Times in ${TIMEZONE}`],
    ['Assistant', report.assistant, 'Current report filter'],
    ['Calls', report.calls.length, 'From the latest 100 saved call records'],
    ['Finished calls', report.finished, 'Completed or failed'],
    ['Completed calls', report.completed, ''],
    ['Failed calls', report.failed, ''],
    ['Completion rate', report.finished ? report.completed / report.finished : null, 'Completed / finished'],
    ['Average duration (seconds)', report.average, 'Completed calls only'],
    ['Events created', report.events, 'Events linked to selected calls'],
    ['Upcoming meetings', report.meetings.upcoming.length, 'Future meeting, interview, demo, and appointment schedules'],
    ['Past meetings', report.meetings.past.length, `Meeting schedules in the last ${report.days} days`],
    ['Scope', 'Latest 100 saved calls', 'Schedules are loaded from the selected date window onward'],
  ])
  summary.getCell('B8').numFmt = '0.0%'
  header(summary); styleData(summary)
  for (const cell of ['B4', 'B6', 'B8', 'B9', 'B10', 'B11', 'B12']) summary.getCell(cell).font = { bold: true, color: { argb: `FF${teal}` } }

  const trend = book.addWorksheet('Trends')
  trend.columns = [{ header: 'INTERVAL START', key: 'label', width: 20 }, { header: 'COMPLETED', key: 'completed', width: 17 }, { header: 'FAILED', key: 'failed', width: 17 }, { header: 'OTHER', key: 'other', width: 17 }, { header: 'COMPLETION RATE', key: 'rate', width: 22 }]
  report.trend.forEach(item => trend.addRow([item.label, item.completed, item.failed, item.other - item.failed, item.completed + item.failed ? item.completed / (item.completed + item.failed) : null]))
  trend.getColumn(5).numFmt = '0.0%'
  header(trend); styleData(trend)
  trend.autoFilter = `A1:E${trend.rowCount}`

  const duration = book.addWorksheet('Duration')
  duration.columns = [{ header: 'DURATION BAND', key: 'band', width: 24 }, { header: 'COMPLETED CALLS', key: 'count', width: 22 }]
  report.durationBands.forEach(item => duration.addRow([item.label, item.count]))
  header(duration); styleData(duration)

  const agents = book.addWorksheet('Assistants')
  agents.columns = [{ header: 'ASSISTANT', key: 'name', width: 28 }, { header: 'CALLS', key: 'total', width: 18 }, { header: 'COMPLETED', key: 'completed', width: 20 }, { header: 'COMPLETION RATE', key: 'rate', width: 24 }]
  report.byAssistant.forEach(item => agents.addRow([item.name, item.total, item.completed, item.total ? item.completed / item.total : null]))
  agents.getColumn(4).numFmt = '0.0%'
  header(agents); styleData(agents)

  const activity = book.addWorksheet('Calling patterns')
  activity.columns = [{ header: 'DAY', key: 'day', width: 16 }, ...report.dayParts.map((part, index) => ({ header: `${part} CALLS`, key: `part${index}`, width: 18 }))]
  report.heatmap.forEach(row => activity.addRow([row[0].day, ...row.map(cell => cell.count)]))
  header(activity); styleData(activity)
  activity.addConditionalFormatting({ ref: `B2:E${activity.rowCount}`, rules: [{ type: 'colorScale', cfvo: [{ type: 'min' }, { type: 'max' }], color: [{ argb: 'FFEAF3EF' }, { argb: `FF${teal}` }] }] })

  const calls = book.addWorksheet('Call details')
  calls.columns = [{ header: 'CALL ID', key: 'id', width: 13 }, { header: 'DATE & TIME', key: 'date', width: 24 }, { header: 'CONTACT', key: 'contact', width: 32 }, { header: 'ASSISTANT', key: 'assistant', width: 22 }, { header: 'STATUS', key: 'status', width: 18 }, { header: 'DURATION (SEC)', key: 'duration', width: 21 }, { header: 'OUTCOME', key: 'outcome', width: 28 }]
  report.calls.forEach(call => calls.addRow([call.id, localDate(call.created_at), call.lead_name || '', call.assistant_name || '', call.status, report.duration(call), call.outcome || '']))
  header(calls); styleData(calls)
  calls.autoFilter = `A1:G${Math.max(2, calls.rowCount)}`

  const addMeetingSheet = (name, items) => {
    const sheet = book.addWorksheet(name)
    sheet.columns = [{ header: 'SCHEDULE ID', key: 'id', width: 17 }, { header: 'TYPE', key: 'type', width: 18 }, { header: 'TITLE', key: 'title', width: 34 }, { header: 'START', key: 'start', width: 25 }, { header: 'END', key: 'end', width: 25 }, { header: 'TIMEZONE', key: 'timezone', width: 22 }, { header: 'STATUS', key: 'status', width: 18 }, { header: 'CONTACT', key: 'contact', width: 29 }, { header: 'ASSISTANT', key: 'assistant', width: 22 }, { header: 'LOCATION', key: 'location', width: 30 }, { header: 'SOURCE', key: 'source', width: 18 }, { header: 'LINKED CALL ID', key: 'call', width: 19 }, { header: 'DETAILS', key: 'details', width: 50 }]
    items.forEach(event => sheet.addRow([event.id, event.event_type, event.title, localDate(event.starts_at), event.ends_at ? localDate(event.ends_at) : '', event.timezone || TIMEZONE, event.status || 'confirmed', event.contact_name || event.lead_name || '', event.call_assistant_name || '', event.location || '', event.source || '', event.call_id || '', event.details || '']))
    header(sheet); styleData(sheet)
    sheet.autoFilter = `A1:M${Math.max(2, sheet.rowCount)}`
    return sheet
  }
  addMeetingSheet('Upcoming meetings', report.meetings.upcoming)
  addMeetingSheet('Past meetings', report.meetings.past)

  const buffer = await book.xlsx.writeBuffer()
  download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `call-report-${stamp()}.xlsx`)
}

export async function downloadPdf(report) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const width = 297
  const navy = [23, 49, 73]
  const teal = [40, 119, 106]
  const muted = [112, 130, 141]
  const line = [225, 233, 232]
  let page = 1
  const text = (value, x, y, size = 10, color = navy, style = 'normal') => {
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
    pdf.text(safeText(value), x, y)
  }
  const rule = (x1, y, x2) => { pdf.setDrawColor(...line); pdf.line(x1, y, x2, y) }
  const pageFrame = subtitle => {
    pdf.setFillColor(...navy); pdf.rect(0, 0, width, 23, 'F')
    text('VOXA  /  REPORTS', 16, 14, 13, [255, 255, 255], 'bold')
    text(subtitle, 16, 34, 18, navy, 'bold')
    text(`Last ${report.days} days  |  ${safeText(report.assistant)}  |  ${TIMEZONE}`, 16, 42, 9, muted)
    rule(16, 47, 281)
    rule(16, 197, 281)
    text(`Calls: latest 100. Past meetings: last ${report.days} days. Upcoming: future schedules.`, 16, 203, 8, muted)
    text(`Page ${page}`, 267, 203, 8, muted)
  }
  const newPage = subtitle => { pdf.addPage(); page++; pageFrame(subtitle) }
  pageFrame('Call performance')

  const cards = [
    ['CALLS', report.calls.length],
    ['COMPLETION RATE', report.finished ? `${Math.round(report.completed / report.finished * 100)}%` : '--'],
    ['AVG. DURATION', `${Math.floor(report.average / 60)}m ${String(report.average % 60).padStart(2, '0')}s`],
    ['EVENTS CREATED', report.events],
  ]
  cards.forEach(([label, value], index) => {
    const x = 16 + index * 68
    pdf.setFillColor(245, 249, 248); pdf.roundedRect(x, 54, 61, 29, 2, 2, 'F')
    text(label, x + 4, 63, 8, muted, 'bold')
    text(String(value), x + 4, 76, 16, navy, 'bold')
  })
  text('Call volume by interval', 16, 96, 11, navy, 'bold')
  const peak = Math.max(1, ...report.trend.map(item => item.completed + item.other))
  const plotX = 25, plotY = 164, plotW = 147, plotH = 55
  ;[0, .5, 1].forEach(fraction => { const y = plotY - fraction * plotH; rule(plotX, y, plotX + plotW); text(Math.round(peak * fraction), 16, y + 1, 7, muted) })
  report.trend.forEach((item, index) => {
    const x = plotX + index * plotW / report.trend.length + 3
    const barW = Math.min(9, plotW / report.trend.length - 4)
    const completeH = item.completed / peak * plotH
    const otherH = item.other / peak * plotH
    pdf.setFillColor(...teal); pdf.rect(x, plotY - completeH, barW, completeH, 'F')
    pdf.setFillColor(206, 223, 220); pdf.rect(x, plotY - completeH - otherH, barW, otherH, 'F')
    text(item.label, x, 170, 6, muted)
  })
  text('Completed', 16, 185, 8, teal); text('Other statuses', 43, 185, 8, muted)
  text('Call status', 194, 96, 11, navy, 'bold')
  const statuses = [['Completed', report.completed], ['Failed', report.failed], ['In progress', report.calls.filter(call => call.status === 'in_progress').length], ['Queued', report.calls.filter(call => call.status === 'queued').length]]
  statuses.forEach(([label, count], index) => {
    const y = 110 + index * 19
    text(label, 194, y, 9, muted); text(String(count), 270, y, 10, navy, 'bold')
    pdf.setFillColor(234, 241, 239); pdf.roundedRect(194, y + 3, 82, 4, 1, 1, 'F')
    if (count) { pdf.setFillColor(...teal); pdf.roundedRect(194, y + 3, 82 * count / report.calls.length, 4, 1, 1, 'F') }
  })

  newPage('Completion and duration')
  text('Completion rate by interval', 16, 60, 11, navy, 'bold')
  const rateY = 145, rateH = 70, rateX = 30, rateW = 230
  ;[0, 25, 50, 75, 100].forEach(value => { const y = rateY - value / 100 * rateH; rule(rateX, y, rateX + rateW); text(`${value}%`, 16, y + 1, 7, muted) })
  let previous = null
  report.trend.forEach((item, index) => {
    const x = rateX + index * rateW / Math.max(1, report.trend.length - 1)
    const total = item.completed + item.failed
    const y = rateY - (total ? item.completed / total : 0) * rateH
    if (total) {
      if (previous) { pdf.setDrawColor(...teal); pdf.setLineWidth(.7); pdf.line(previous.x, previous.y, x, y) }
      pdf.setFillColor(...teal); pdf.circle(x, y, 1.8, 'F')
      previous = { x, y }
    } else previous = null
    text(item.label, x - 3, 153, 7, muted)
  })
  text('Completed-call duration', 16, 169, 11, navy, 'bold')
  const durationPeak = Math.max(1, ...report.durationBands.map(item => item.count))
  report.durationBands.forEach((band, index) => {
    const x = 16 + index * 54
    text(band.label, x, 180, 8, muted)
    pdf.setFillColor(233, 241, 239); pdf.rect(x, 183, 44, 5, 'F')
    pdf.setFillColor(...teal); pdf.rect(x, 183, band.count / durationPeak * 44, 5, 'F')
    text(`${band.count} calls`, x, 194, 8, navy, 'bold')
  })

  newPage('Calling patterns')
  text('Call starts by weekday and time of day', 16, 59, 11, navy, 'bold')
  report.dayParts.forEach((part, index) => text(part, 65 + index * 48, 70, 8, muted, 'bold'))
  const heatPeak = Math.max(1, ...report.heatmap.flat().map(cell => cell.count))
  report.heatmap.forEach((row, dayIndex) => {
    const y = 76 + dayIndex * 15
    text(row[0].day, 27, y + 6, 9, navy, 'bold')
    row.forEach((cell, partIndex) => {
      const strength = cell.count / heatPeak
      pdf.setFillColor(236 - strength * 196, 244 - strength * 125, 241 - strength * 135)
      pdf.roundedRect(60 + partIndex * 48, y, 40, 10, 1.5, 1.5, 'F')
      text(String(cell.count), 78 + partIndex * 48, y + 6.5, 9, cell.count && strength > .55 ? [255, 255, 255] : navy, 'bold')
    })
  })
  text('Darker cells indicate more call starts in the selected period.', 16, 190, 8, muted)

  newPage('Assistant performance')
  text('Completed calls by assistant', 16, 59, 11, navy, 'bold')
  if (!report.byAssistant.length) text('No assistant activity in this period.', 16, 75, 9, muted)
  report.byAssistant.slice(0, 7).forEach((item, index) => {
    const y = 72 + index * 15
    text(item.name, 16, y, 9, navy, 'bold')
    pdf.setFillColor(234, 241, 239); pdf.roundedRect(63, y - 5, 97, 5, 1, 1, 'F')
    if (item.completed) { pdf.setFillColor(...teal); pdf.roundedRect(63, y - 5, 97 * item.completed / item.total, 5, 1, 1, 'F') }
    text(`${item.completed} / ${item.total} completed`, 165, y, 8, muted)
  })
  text('Operational summary', 16, 185, 11, navy, 'bold')
  text(`${report.finished} finished calls`, 105, 185, 8, muted)
  text(`${report.failed} failed`, 168, 185, 8, muted)
  text(`${Math.round(report.totalSeconds / 60)} completed talk minutes`, 209, 185, 8, muted)

  newPage('Call details')
  const columns = [16, 32, 73, 144, 189, 225, 251]
  const headers = ['ID', 'DATE / TIME', 'CONTACT', 'ASSISTANT', 'STATUS', 'DURATION', 'OUTCOME']
  let y = 57
  const tableHeader = () => {
    pdf.setFillColor(239, 246, 244); pdf.rect(16, y - 6, 265, 10, 'F')
    headers.forEach((value, index) => text(value, columns[index] + 2, y, 7, navy, 'bold'))
    y += 10
  }
  tableHeader()
  if (!report.calls.length) text('No calls match the selected filters.', 18, y + 8, 9, muted)
  report.calls.forEach(call => {
    if (y > 184) { newPage('Call details (continued)'); y = 57; tableHeader() }
    const values = [call.id, localDate(call.created_at), call.lead_name, call.assistant_name, call.status, `${report.duration(call)}s`, call.outcome]
    values.forEach((value, index) => {
      const max = [7, 23, 35, 20, 15, 10, 17][index]
      const label = safeText(value)
      text(label.length > max ? `${label.slice(0, max - 1)}...` : label || '-', columns[index] + 2, y, 7, index === 0 ? navy : muted)
    })
    rule(16, y + 3, 281)
    y += 9
  })

  const addMeetingPages = (title, items) => {
    newPage(`${title} (${items.length})`)
    let meetingY = 58
    if (!items.length) { text(`No ${title.toLowerCase()} match this report.`, 16, 65, 9, muted); return }
    items.forEach(event => {
      if (meetingY > 166) { newPage(`${title} (continued)`); meetingY = 58 }
      pdf.setFillColor(246, 249, 248)
      pdf.roundedRect(16, meetingY - 6, 265, 29, 1.5, 1.5, 'F')
      const short = (value, max) => { const label = safeText(value); return label.length > max ? `${label.slice(0, max - 3)}...` : label || '-' }
      text(short(event.title, 46), 20, meetingY, 10, navy, 'bold')
      text(short(event.event_type, 16), 116, meetingY, 8, teal, 'bold')
      text(localDate(event.starts_at), 156, meetingY, 8, navy, 'bold')
      text(short(event.status || 'confirmed', 16), 232, meetingY, 8, teal)
      text(`Contact: ${short(event.contact_name || event.lead_name, 31)}`, 20, meetingY + 8, 8, muted)
      text(`Ends: ${event.ends_at ? localDate(event.ends_at) : 'Not set'}`, 94, meetingY + 8, 8, muted)
      text(`Location: ${short(event.location, 29)}`, 171, meetingY + 8, 8, muted)
      text(`Source: ${short(event.source, 15)}`, 20, meetingY + 16, 8, muted)
      text(`Call: ${event.call_id || '-'}`, 69, meetingY + 16, 8, muted)
      text(`Notes: ${short(event.details, 88)}`, 102, meetingY + 16, 8, muted)
      meetingY += 34
    })
  }
  addMeetingPages('Upcoming meetings', report.meetings.upcoming)
  addMeetingPages('Past meetings', report.meetings.past)
  pdf.save(`call-report-${stamp()}.pdf`)
}
