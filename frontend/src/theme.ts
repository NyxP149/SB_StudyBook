const THEME_KEY = 'studybook.theme'
const MODE_KEY = 'studybook.mode'

export const THEMES = ['gold', 'black', 'green', 'purple', 'orange', 'cyan', 'blue', 'fuchsia'] as const
export type ThemeName = (typeof THEMES)[number]

const DEFAULT_THEME: ThemeName = 'gold'

export function readStoredTheme(): ThemeName {
  const stored = localStorage.getItem(THEME_KEY)
  return (THEMES as readonly string[]).includes(stored ?? '') ? (stored as ThemeName) : DEFAULT_THEME
}

export function applyTheme(theme: ThemeName) {
  if (theme === DEFAULT_THEME) {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
  localStorage.setItem(THEME_KEY, theme)
}

// Axe indépendant de la couleur d'accent ci-dessus : le fond papier chaud
// (défaut), un fond clair neutre, ou un fond sombre. Combinable librement
// avec n'importe lequel des 8 accents.
export const MODES = ['default', 'light', 'dark'] as const
export type ModeName = (typeof MODES)[number]

const DEFAULT_MODE: ModeName = 'default'

export function readStoredMode(): ModeName {
  const stored = localStorage.getItem(MODE_KEY)
  return (MODES as readonly string[]).includes(stored ?? '') ? (stored as ModeName) : DEFAULT_MODE
}

export function applyMode(mode: ModeName) {
  if (mode === DEFAULT_MODE) {
    document.documentElement.removeAttribute('data-mode')
  } else {
    document.documentElement.setAttribute('data-mode', mode)
  }
  localStorage.setItem(MODE_KEY, mode)
}
