import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './AppShell.css'

export function AppShell({ children }: { children: ReactNode }) {
  const { username, logout } = useAuth()

  return (
    <div className="shell">
      <header className="shell-header">
        <NavLink to="/" className="shell-brand">
          <span className="shell-brand-mark">📖</span>
          <span className="shell-brand-text">
            <strong>StudyBook</strong>
            <em>powered by JarVyX</em>
          </span>
        </NavLink>
        <nav className="shell-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Nouvelle note
          </NavLink>
          <NavLink to="/notes" className={({ isActive }) => (isActive ? 'active' : '')}>
            Mes notes
          </NavLink>
          <NavLink to="/templates" className={({ isActive }) => (isActive ? 'active' : '')}>
            Modèles
          </NavLink>
          <NavLink to="/folders" className={({ isActive }) => (isActive ? 'active' : '')}>
            Dossiers
          </NavLink>
        </nav>
        <div className="shell-account">
          <span className="shell-username">{username}</span>
          <button type="button" className="shell-logout" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </header>
      <main className="shell-main">{children}</main>
    </div>
  )
}
