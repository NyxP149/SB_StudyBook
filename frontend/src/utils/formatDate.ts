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

/** Pour un LocalDate pur ("2026-08-11", pas d'heure) : parsé comme date
 * locale (year, month, day) plutôt que via `new Date(iso)`, qui interprète
 * une chaîne "YYYY-MM-DD" comme minuit UTC et peut afficher le jour d'avant
 * dans les fuseaux à décalage négatif. */
export function formatDateOnly(isoDate: string, lang: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(localeFor(lang), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
