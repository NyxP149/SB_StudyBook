const THEME_KEY = 'studybook.theme'

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
