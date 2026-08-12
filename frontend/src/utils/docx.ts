import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx'
import { fetchNoteImageBytes } from '../api/client'
import type { Note } from '../types'

const NOTE_IMAGE_PREFIX = 'note-image:'
const MAX_IMAGE_WIDTH = 500

function imageTypeFromContentType(contentType: string): 'jpg' | 'png' | 'gif' | 'bmp' {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('bmp')) return 'bmp'
  return 'jpg'
}

function loadImageDimensions(data: ArrayBuffer, contentType: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], { type: contentType })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Impossible de lire les dimensions de l\'image'))
    }
    img.src = url
  })
}

async function buildImageParagraph(imageId: string): Promise<Paragraph> {
  const { data, contentType } = await fetchNoteImageBytes(imageId)
  const { width, height } = await loadImageDimensions(data, contentType)
  const scale = Math.min(1, MAX_IMAGE_WIDTH / width)
  return new Paragraph({
    children: [
      new ImageRun({
        type: imageTypeFromContentType(contentType),
        data,
        transformation: { width: Math.round(width * scale), height: Math.round(height * scale) },
      }),
    ],
  })
}

function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      runs.push(new TextRun(text.slice(lastIndex, match.index)))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }))
    } else {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true }))
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    runs.push(new TextRun(text.slice(lastIndex)))
  }
  return runs.length > 0 ? runs : [new TextRun(text)]
}

async function markdownToParagraphs(markdown: string): Promise<Paragraph[]> {
  const lines = markdown.split('\n')
  const paragraphs: Paragraph[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '') continue

    const headingMatch = /^(#{1,3})\s+(.*)/.exec(line)
    if (headingMatch) {
      const level = headingMatch[1].length
      const heading = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3
      paragraphs.push(new Paragraph({ heading, children: parseInline(headingMatch[2]) }))
      continue
    }

    const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line)
    if (imageMatch) {
      const url = imageMatch[2]
      if (url.startsWith(NOTE_IMAGE_PREFIX)) {
        try {
          paragraphs.push(await buildImageParagraph(url.slice(NOTE_IMAGE_PREFIX.length)))
        } catch {
          paragraphs.push(new Paragraph({ children: [new TextRun({ text: `[Image indisponible : ${imageMatch[1]}]`, italics: true })] }))
        }
      } else {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: `[Image : ${imageMatch[1]}]`, italics: true })] }))
      }
      continue
    }

    const bulletMatch = /^[-*+]\s+(.*)/.exec(line)
    if (bulletMatch) {
      paragraphs.push(new Paragraph({ bullet: { level: 0 }, children: parseInline(bulletMatch[1]) }))
      continue
    }

    const numberedMatch = /^\d+\.\s+(.*)/.exec(line)
    if (numberedMatch) {
      paragraphs.push(new Paragraph({ bullet: { level: 0 }, children: parseInline(numberedMatch[1]) }))
      continue
    }

    paragraphs.push(new Paragraph({ children: parseInline(line) }))
  }

  return paragraphs
}

export async function buildNoteDocxBlob(note: Note): Promise<Blob> {
  const title = note.originalFilename.replace(/\.[^./]+$/, '')
  const bodyParagraphs = await markdownToParagraphs(note.noteMarkdown ?? '')
  const doc = new Document({
    sections: [
      {
        children: [new Paragraph({ text: title, heading: HeadingLevel.TITLE }), ...bodyParagraphs],
      },
    ],
  })
  return Packer.toBlob(doc)
}

export async function downloadNoteDocx(note: Note): Promise<void> {
  const blob = await buildNoteDocxBlob(note)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${note.originalFilename.replace(/\.[^./]+$/, '')}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
