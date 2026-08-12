import type { StudyArgument, StudyProgram } from '../types'

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// RFC 5545: content lines should be folded at 75 octets, continuation
// lines start with a single space. Char-based (not byte-perfect for
// multi-byte UTF-8) but close enough for the titles/notes this covers.
function foldLine(line: string): string {
  if (line.length <= 74) return line
  const parts = [line.slice(0, 74)]
  let rest = line.slice(74)
  while (rest.length > 0) {
    parts.push(rest.slice(0, 73))
    rest = rest.slice(73)
  }
  return parts.join('\r\n ')
}

function formatDateStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

function formatAllDay(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

export function buildProgramIcs(program: StudyProgram, args: StudyArgument[]): string {
  const now = formatDateStamp(new Date())
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StudyBook//FR', 'CALSCALE:GREGORIAN']
  for (const arg of args) {
    lines.push('BEGIN:VEVENT')
    lines.push(foldLine(`UID:${arg.id}@studybook.app`))
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART;VALUE=DATE:${formatAllDay(arg.scheduledDate)}`)
    lines.push(foldLine(`SUMMARY:${escapeIcsText(arg.title)}`))
    if (arg.content) {
      lines.push(foldLine(`DESCRIPTION:${escapeIcsText(arg.content)}`))
    }
    lines.push(`CATEGORIES:${escapeIcsText(program.name)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'programme'
}

export function downloadProgramIcs(program: StudyProgram, args: StudyArgument[]) {
  const content = buildProgramIcs(program, args)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(program.name)}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
