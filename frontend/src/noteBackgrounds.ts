export const FLAT_BACKGROUNDS = ['or', 'sauge', 'bordeaux', 'ardoise', 'prune', 'olive', 'corail'] as const
export const CHEMISE_BACKGROUNDS = [
  'nuit-etoilee',
  'seve-de-sauge',
  'poudre-rose',
  'feuille-tropicale',
  'lin-dore',
  'facettes-sombres',
  'aube-corail',
  'marbre-clair',
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
  'nuit-etoilee':
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cpolygon points='0,80 0,50 56,32 96,46 152,18 200,42 252,27 304,48 352,24 400,44 400,80' fill='%230c1024' fill-opacity='0.85'/%3E%3C/svg%3E") no-repeat bottom / 100% 70px,` +
    'linear-gradient(160deg, #1b2340 0%, #10152b 100%)',
  'seve-de-sauge':
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 70 98'%3E%3Cpath d='M35 2C63 14 63 84 35 96C7 84 7 14 35 2Z' fill='%235c7a3f' fill-opacity='0.3'/%3E%3Cline x1='35' y1='8' x2='35' y2='90' stroke='%235c7a3f' stroke-opacity='0.32' stroke-width='1.4'/%3E%3C/svg%3E") no-repeat bottom 12px right 14px / 60px auto,` +
    'radial-gradient(circle at 20% 18%, rgba(124,164,101,0.55), transparent 42%),' +
    'radial-gradient(circle at 82% 12%, rgba(93,138,110,0.5), transparent 40%),' +
    'radial-gradient(circle at 75% 70%, rgba(157,184,124,0.5), transparent 45%),' +
    'radial-gradient(circle at 15% 78%, rgba(110,150,120,0.45), transparent 42%),' +
    '#eaf1e2',
  'poudre-rose':
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Cg fill='%23b06a86' fill-opacity='0.34'%3E%3Cellipse cx='40' cy='18' rx='9' ry='16'/%3E%3Cellipse cx='40' cy='18' rx='9' ry='16' transform='rotate(72 40 40)'/%3E%3Cellipse cx='40' cy='18' rx='9' ry='16' transform='rotate(144 40 40)'/%3E%3Cellipse cx='40' cy='18' rx='9' ry='16' transform='rotate(216 40 40)'/%3E%3Cellipse cx='40' cy='18' rx='9' ry='16' transform='rotate(288 40 40)'/%3E%3C/g%3E%3Ccircle cx='40' cy='40' r='6' fill='%23b06a86' fill-opacity='0.42'/%3E%3C/svg%3E") no-repeat bottom 10px right 14px / 52px auto,` +
    'radial-gradient(circle at 22% 16%, rgba(214,150,171,0.5), transparent 42%),' +
    'radial-gradient(circle at 85% 20%, rgba(232,180,195,0.55), transparent 42%),' +
    'radial-gradient(circle at 78% 75%, rgba(198,130,155,0.45), transparent 46%),' +
    'radial-gradient(circle at 12% 72%, rgba(224,170,188,0.5), transparent 42%),' +
    '#fbeef0',
  'feuille-tropicale':
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140'%3E%3Cpath d='M50 2C90 20 90 120 50 138C10 120 10 20 50 2Z' fill='%23ffffff' fill-opacity='0.14'/%3E%3Cline x1='50' y1='10' x2='50' y2='130' stroke='%23ffffff' stroke-opacity='0.2' stroke-width='2'/%3E%3C/svg%3E") no-repeat top right / 110px auto,` +
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140'%3E%3Cpath d='M50 2C90 20 90 120 50 138C10 120 10 20 50 2Z' fill='%23000000' fill-opacity='0.14'/%3E%3C/svg%3E") no-repeat bottom left / 80px auto,` +
    'linear-gradient(155deg, #1c9c74 0%, #0f6e56 100%)',
  'lin-dore':
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 130'%3E%3Cline x1='45' y1='8' x2='40' y2='118' stroke='%23a9822f' stroke-opacity='0.55' stroke-width='1.6'/%3E%3Cellipse cx='45' cy='30' rx='9' ry='14' fill='%23c7a349' fill-opacity='0.5' transform='rotate(-35 45 30)'/%3E%3Cellipse cx='42' cy='62' rx='8' ry='12' fill='%23c7a349' fill-opacity='0.5' transform='rotate(30 42 62)'/%3E%3Cellipse cx='41' cy='94' rx='7' ry='11' fill='%23c7a349' fill-opacity='0.5' transform='rotate(-25 41 94)'/%3E%3C/svg%3E") no-repeat top right / 72px auto,` +
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 130'%3E%3Cline x1='45' y1='8' x2='40' y2='118' stroke='%23a9822f' stroke-opacity='0.55' stroke-width='1.6'/%3E%3Cellipse cx='45' cy='30' rx='9' ry='14' fill='%23c7a349' fill-opacity='0.5' transform='rotate(-35 45 30)'/%3E%3Cellipse cx='42' cy='62' rx='8' ry='12' fill='%23c7a349' fill-opacity='0.5' transform='rotate(30 42 62)'/%3E%3Cellipse cx='41' cy='94' rx='7' ry='11' fill='%23c7a349' fill-opacity='0.5' transform='rotate(-25 41 94)'/%3E%3C/svg%3E") no-repeat bottom left / 56px auto,` +
    '#fbf3dd',
  'facettes-sombres':
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cpolygon points='40,0 200,20 164,140 20,200 0,80' fill='%233a3c43' fill-opacity='0.6'/%3E%3Cpolygon points='60,8 192,40 138,150 30,120' fill='%2352545c' fill-opacity='0.5'/%3E%3Cpolygon points='90,130 200,155 150,200 70,180' fill='%23151618' fill-opacity='0.65'/%3E%3C/svg%3E") no-repeat top right / 160px auto,` +
    'linear-gradient(140deg, #2b2d33 0%, #1c1e22 60%, #26282d 100%)',
  'aube-corail': 'linear-gradient(165deg, #fbe0c8 0%, #f2b48f 55%, #e2896a 100%)',
  'marbre-clair':
    'linear-gradient(112deg, transparent 38%, rgba(150,138,112,0.22) 39.5%, transparent 41%),' +
    'linear-gradient(96deg, transparent 58%, rgba(150,138,112,0.16) 59%, transparent 60.5%),' +
    'linear-gradient(128deg, transparent 70%, rgba(184,140,80,0.18) 71%, transparent 72.5%),' +
    'linear-gradient(104deg, transparent 18%, rgba(150,138,112,0.14) 19%, transparent 20.5%),' +
    'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.5), transparent 60%),' +
    '#f5f2ea',
}
