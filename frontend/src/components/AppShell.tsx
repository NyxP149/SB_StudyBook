import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { applyMode, applyTheme, readStoredMode, readStoredTheme, MODES, THEMES, type ModeName, type ThemeName } from '../theme'
import './AppShell.css'

const SIDEBAR_KEY = 'studybook.sidebarCollapsed'
const MOBILE_BREAKPOINT = 768

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'it', label: 'IT' },
]

const THEME_SWATCH_COLOR: Record<ThemeName, string> = {
  gold: '#d9a44e',
  black: '#8b8b94',
  green: '#7cb87c',
  purple: '#b98bd6',
  orange: '#eba36c',
  cyan: '#6fc9cf',
  blue: '#85aee0',
  fuchsia: '#e488c4',
}

const MODE_ICON: Record<ModeName, string> = {
  default: '📜',
  light: '☀️',
  dark: '🌙',
}

function readInitialCollapsed(): boolean {
  const stored = localStorage.getItem(SIDEBAR_KEY)
  if (stored !== null) return stored === 'true'
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation()
  const { username, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(readInitialCollapsed)
  const [theme, setTheme] = useState<ThemeName>(readStoredTheme)
  const [mode, setMode] = useState<ModeName>(readStoredMode)

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed))
  }, [collapsed])

  function selectTheme(next: ThemeName) {
    setTheme(next)
    applyTheme(next)
  }

  function selectMode(next: ModeName) {
    setMode(next)
    applyMode(next)
  }

  function collapseOnMobile() {
    if (window.innerWidth < MOBILE_BREAKPOINT) setCollapsed(true)
  }

  return (
    <div className={`shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {collapsed && (
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed(false)}
          aria-label={t('shell.expandSidebar')}
        >
          ☰
        </button>
      )}

      {collapsed && (
        <button type="button" className="quick-logout" onClick={logout} aria-label={t('shell.logout')} title={t('shell.logout')}>
          ⏻
        </button>
      )}

      <aside className="shell-sidebar">
        <div className="shell-sidebar-top">
          <NavLink to="/" className="shell-brand" onClick={collapseOnMobile}>
            <span className="shell-brand-mark">📖</span>
            <span className="shell-brand-text">
              <strong>StudyBook</strong>
            </span>
          </NavLink>
          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={() => setCollapsed(true)}
            aria-label={t('shell.collapseSidebar')}
          >
            ✕
          </button>
        </div>

        <nav className="shell-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')} onClick={collapseOnMobile}>
            {t('shell.nav.newNote')}
          </NavLink>
          <NavLink to="/notes" className={({ isActive }) => (isActive ? 'active' : '')} onClick={collapseOnMobile}>
            {t('shell.nav.myNotes')}
          </NavLink>
          <NavLink to="/templates" className={({ isActive }) => (isActive ? 'active' : '')} onClick={collapseOnMobile}>
            {t('shell.nav.templates')}
          </NavLink>
          <NavLink to="/folders" className={({ isActive }) => (isActive ? 'active' : '')} onClick={collapseOnMobile}>
            {t('shell.nav.folders')}
          </NavLink>
          <NavLink
            to="/study"
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={collapseOnMobile}
          >
            {t('shell.nav.study')}
          </NavLink>
        </nav>

        <div className="shell-sidebar-footer">
          <div className="shell-lang-switch" role="group" aria-label={t('shell.language')}>
            {LANGUAGES.map((lng) => (
              <button
                key={lng.code}
                type="button"
                className={i18n.language === lng.code ? 'active' : ''}
                onClick={() => i18n.changeLanguage(lng.code)}
              >
                {lng.label}
              </button>
            ))}
          </div>
          <div className="shell-mode-switch" role="group" aria-label={t('shell.mode')}>
            {MODES.map((name) => (
              <button
                key={name}
                type="button"
                className={mode === name ? 'active' : ''}
                onClick={() => selectMode(name)}
                title={t(`shell.modeName.${name}`)}
              >
                {MODE_ICON[name]} {t(`shell.modeName.${name}`)}
              </button>
            ))}
          </div>
          <div className="shell-theme-switch" role="group" aria-label={t('shell.theme')}>
            {THEMES.map((name) => (
              <button
                key={name}
                type="button"
                className={`shell-theme-swatch ${theme === name ? 'active' : ''}`}
                style={{ background: THEME_SWATCH_COLOR[name] }}
                onClick={() => selectTheme(name)}
                aria-label={t(`shell.themeName.${name}`)}
                title={t(`shell.themeName.${name}`)}
              />
            ))}
          </div>
          <div className="shell-account">
            <span className="shell-username">{username}</span>
            <button type="button" className="shell-logout" onClick={logout}>
              {t('shell.logout')}
            </button>
          </div>
          <em className="shell-tagline">{t('shell.brandTagline')}</em>
        </div>
      </aside>

      {!collapsed && <div className="shell-backdrop" onClick={() => setCollapsed(true)} />}

      <div className="shell-content-area">
        <main className="shell-main">{children}</main>
      </div>
    </div>
  )
}
