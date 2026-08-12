import { jsPDF } from 'jspdf'
import { fetchNoteImageBytes } from '../api/client'
import type { Note } from '../types'

const NOTE_IMAGE_PREFIX = 'note-image:'
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 20
const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2
const LINE_HEIGHT = 6
const PARAGRAPH_GAP = 3
const PX_TO_MM = 25.4 / 96

type Run = { text: string; bold?: boolean; italic?: boolean }

function parseInline(text: string): Run[] {
  const runs: Run[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) runs.push({ text: text.slice(lastIndex, match.index) })
    const token = match[0]
    if (token.startsWith('**')) runs.push({ text: token.slice(2, -2), bold: true })
    else runs.push({ text: token.slice(1, -1), italic: true })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) runs.push({ text: text.slice(lastIndex) })
  return runs.length > 0 ? runs : [{ text }]
}

function loadImageAsPngDataUrl(data: ArrayBuffer, contentType: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], { type: contentType })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) {
        reject(new Error('Contexte canvas indisponible'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Impossible de lire l\'image'))
    }
    img.src = url
  })
}

class PdfWriter {
  doc = new jsPDF({ unit: 'mm', format: 'a4' })
  y = MARGIN

  private ensureSpace(height: number) {
    if (this.y + height > PAGE_HEIGHT - MARGIN) {
      this.doc.addPage()
      this.y = MARGIN
    }
  }

  private fontStyleFor(run: { bold?: boolean; italic?: boolean }) {
    if (run.bold && run.italic) return 'bolditalic'
    if (run.bold) return 'bold'
    if (run.italic) return 'italic'
    return 'normal'
  }

  private writeRuns(runs: Run[], opts: { fontSize: number; indent?: number; bulletPrefix?: string }) {
    const indent = opts.indent ?? 0
    const maxWidth = USABLE_WIDTH - indent
    this.doc.setFontSize(opts.fontSize)

    const words: Run[] = []
    for (const run of runs) {
      for (const part of run.text.split(/(\s+)/).filter((p) => p !== '')) {
        words.push({ text: part, bold: run.bold, italic: run.italic })
      }
    }

    const bulletWidth = opts.bulletPrefix ? this.doc.getTextWidth(opts.bulletPrefix) : 0
    let line: Run[] = []
    let lineWidth = 0
    let firstLine = true

    const flushLine = () => {
      this.ensureSpace(LINE_HEIGHT)
      let x = MARGIN + indent
      if (firstLine && opts.bulletPrefix) {
        this.doc.setFont('helvetica', 'normal')
        this.doc.text(opts.bulletPrefix, x, this.y)
        x += bulletWidth
      }
      for (const w of line) {
        this.doc.setFont('helvetica', this.fontStyleFor(w))
        this.doc.text(w.text, x, this.y)
        x += this.doc.getTextWidth(w.text)
      }
      this.y += LINE_HEIGHT
      line = []
      lineWidth = 0
      firstLine = false
    }

    for (const w of words) {
      const available = maxWidth - (firstLine ? bulletWidth : 0)
      if (w.text.trim() === '') {
        if (line.length === 0) continue
        this.doc.setFont('helvetica', this.fontStyleFor(w))
        const spaceWidth = this.doc.getTextWidth(' ')
        if (lineWidth + spaceWidth > available) continue
        line.push({ text: ' ' })
        lineWidth += spaceWidth
        continue
      }
      this.doc.setFont('helvetica', this.fontStyleFor(w))
      const wordWidth = this.doc.getTextWidth(w.text)
      if (lineWidth + wordWidth > available && line.length > 0) {
        flushLine()
        line.push(w)
        lineWidth = wordWidth
      } else {
        line.push(w)
        lineWidth += wordWidth
      }
    }
    if (line.length > 0) flushLine()
    this.y += PARAGRAPH_GAP
  }

  writeTitle(text: string) {
    this.writeRuns([{ text, bold: true }], { fontSize: 20 })
    this.y += 2
  }

  writeHeading(text: string, level: number) {
    const fontSize = level === 1 ? 17 : level === 2 ? 14 : 12
    this.y += 2
    this.writeRuns(parseInline(text).map((r) => ({ ...r, bold: true })), { fontSize })
  }

  writeParagraph(text: string) {
    this.writeRuns(parseInline(text), { fontSize: 11 })
  }

  writeBullet(text: string) {
    this.writeRuns(parseInline(text), { fontSize: 11, indent: 6, bulletPrefix: '•  ' })
  }

  async writeImage(imageId: string, altText: string) {
    try {
      const { data, contentType } = await fetchNoteImageBytes(imageId)
      const { dataUrl, width, height } = await loadImageAsPngDataUrl(data, contentType)
      let mmWidth = width * PX_TO_MM
      let mmHeight = height * PX_TO_MM
      if (mmWidth > USABLE_WIDTH) {
        const scale = USABLE_WIDTH / mmWidth
        mmWidth *= scale
        mmHeight *= scale
      }
      this.ensureSpace(mmHeight)
      this.doc.addImage(dataUrl, 'PNG', MARGIN, this.y, mmWidth, mmHeight)
      this.y += mmHeight + PARAGRAPH_GAP
    } catch {
      this.writeRuns([{ text: `[Image indisponible : ${altText}]`, italic: true }], { fontSize: 10 })
    }
  }
}

async function writeMarkdown(writer: PdfWriter, markdown: string) {
  const lines = markdown.split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '') continue

    const headingMatch = /^(#{1,3})\s+(.*)/.exec(line)
    if (headingMatch) {
      writer.writeHeading(headingMatch[2], headingMatch[1].length)
      continue
    }

    const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line)
    if (imageMatch) {
      const url = imageMatch[2]
      if (url.startsWith(NOTE_IMAGE_PREFIX)) {
        await writer.writeImage(url.slice(NOTE_IMAGE_PREFIX.length), imageMatch[1])
      } else {
        writer.writeParagraph(`[Image : ${imageMatch[1]}]`)
      }
      continue
    }

    const bulletMatch = /^[-*+]\s+(.*)/.exec(line)
    if (bulletMatch) {
      writer.writeBullet(bulletMatch[1])
      continue
    }

    const numberedMatch = /^\d+\.\s+(.*)/.exec(line)
    if (numberedMatch) {
      writer.writeBullet(numberedMatch[1])
      continue
    }

    writer.writeParagraph(line)
  }
}

export async function buildNotePdfBlob(note: Note): Promise<Blob> {
  const title = note.originalFilename.replace(/\.[^./]+$/, '')
  const writer = new PdfWriter()
  writer.writeTitle(title)
  await writeMarkdown(writer, note.noteMarkdown ?? '')
  return writer.doc.output('blob')
}

export async function downloadNotePdf(note: Note): Promise<void> {
  const blob = await buildNotePdfBlob(note)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${note.originalFilename.replace(/\.[^./]+$/, '')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
