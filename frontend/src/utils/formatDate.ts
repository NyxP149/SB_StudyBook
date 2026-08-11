const LOCALE_BY_LANG: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  it: 'it-IT',
}

export function localeFor(lang: string): string {
  return LOCALE_BY_LANG[lang] ?? 'fr-FR'
}

export function formatDateTime(iso: string, lang: string): string {
  return new Date(iso).toLocaleString(localeFor(lang))
}

export function formatDateShort(iso: string, lang: string): string {
  return new Date(iso).toLocaleString(localeFor(lang), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
