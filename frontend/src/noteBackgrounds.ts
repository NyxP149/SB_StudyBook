export const FLAT_BACKGROUNDS = ['or', 'sauge', 'bordeaux', 'ardoise', 'prune', 'olive', 'corail'] as const
export const CHEMISE_BACKGROUNDS = [
  'parchemin',
  'nuit-etoilee',
  'lin-naturel',
  'feuille-olivier',
  'aquarelle-poudree',
  'ardoise-minerale',
] as const

export const NOTE_BACKGROUNDS = [...FLAT_BACKGROUNDS, ...CHEMISE_BACKGROUNDS] as const
export type NoteBackground = (typeof NOTE_BACKGROUNDS)[number]

export function isNoteBackground(value: string): value is NoteBackground {
  return (NOTE_BACKGROUNDS as readonly string[]).includes(value)
}

export function backgroundClassName(background: string | null): string {
  return background && isNoteBackground(background) ? `note-bg-${background}` : ''
}

export const BACKGROUND_PREVIEW: Record<NoteBackground, string> = {
  or: '#f9edd3',
  sauge: '#e7efe0',
  bordeaux: '#f6e5e5',
  ardoise: '#e6ebf1',
  prune: '#f0e3f0',
  olive: '#eef0dd',
  corail: '#fbe6dd',
  parchemin: 'radial-gradient(ellipse at center, #f6ecd4 0%, #e6d3a8 100%)',
  'nuit-etoilee': 'linear-gradient(160deg, #1b2340 0%, #10152b 100%)',
  'lin-naturel': 'repeating-linear-gradient(45deg, #efe7d8, #efe7d8 3px, #e9dfcb 3px, #e9dfcb 6px)',
  'feuille-olivier': 'radial-gradient(ellipse at top right, #dbe6cd 0%, #c9d9b8 100%)',
  'aquarelle-poudree': 'radial-gradient(ellipse at 30% 20%, #fbe6ea 0%, #f3d6de 60%, #ecc9d6 100%)',
  'ardoise-minerale': 'linear-gradient(135deg, #2b2d33 0%, #1e2024 50%, #303339 100%)',
}
