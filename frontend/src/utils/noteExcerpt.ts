/** Extrait le paragraphe sous "## Thème / idée principale" pour l'aperçu des cartes. */
export function extractTheme(noteMarkdown: string | null): string | null {
  if (!noteMarkdown) return null

  const match = noteMarkdown.match(/##\s*Th[eè]me[^\n]*\n+([^#]+)/i)
  if (!match) return null

  const text = match[1].trim().split('\n')[0]?.trim()
  return text && !text.startsWith('_(') ? text : null
}
