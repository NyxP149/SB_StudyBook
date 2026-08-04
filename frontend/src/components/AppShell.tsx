import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import './AppShell.css'

export function AppShell({ children }: { children: ReactNode }) {
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
        </nav>
      </header>
      <main className="shell-main">{children}</main>
    </div>
  )
}
