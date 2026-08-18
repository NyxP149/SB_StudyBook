import type { TemplateSection } from '../types'

// Only top-level markdown headings (#, ##, ###) are considered — those are
// what the formatting toolbar and the LLM-generated notes both use, so a
// note built either way yields sensible section titles here.
const HEADING_RE = /^#{1,3}\s+(.+)$/gm

function stripInlineMarkup(text: string): string {
  return text
    .replace(/<\/?u>/gi, '')
    .replace(/<mark[^>]*>/gi, '')
    .replace(/<\/mark>/gi, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .trim()
}

export function extractTemplateSections(markdown: string, instructions: string): TemplateSection[] {
  const sections: TemplateSection[] = []
  const seen = new Set<string>()
  for (const match of markdown.matchAll(HEADING_RE)) {
    const title = stripInlineMarkup(match[1])
    if (!title || seen.has(title)) continue
    seen.add(title)
    sections.push({ title, instructions })
  }
  return sections
}
