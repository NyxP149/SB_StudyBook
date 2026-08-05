import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listNotes, listTemplates } from '../api/client'
import { NoteCard } from '../components/NoteCard'
import type { NoteStatus, NoteSummary, Template } from '../types'
import './NotesListPage.css'

const STATUS_FILTERS: Array<{ value: NoteStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'PENDING', label: 'En cours' },
  { value: 'DONE', label: 'Terminées' },
  { value: 'FAILED', label: 'Échecs' },
]

export function NotesListPage() {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<NoteStatus | 'ALL'>('ALL')
  const [templateFilter, setTemplateFilter] = useState('ALL')

  useEffect(() => {
    let cancelled = false
    listNotes()
      .then((result) => {
        if (!cancelled) setNotes(result)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue')
      })
    listTemplates()
      .then((result) => {
        if (!cancelled) setTemplates(result)
      })
      .catch(() => {
        if (!cancelled) setTemplates([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const templateNames = useMemo(() => new Map(templates.map((t) => [t.id, t.name])), [templates])

  const filteredNotes = useMemo(() => {
    if (!notes) return null
    const query = search.trim().toLowerCase()
    return notes.filter((note) => {
      if (statusFilter !== 'ALL' && note.status !== statusFilter) return false
      if (templateFilter !== 'ALL') {
        if (templateFilter === 'DEFAULT' ? note.templateId !== null : note.templateId !== templateFilter) return false
      }
      if (query && !note.originalFilename.toLowerCase().includes(query)) return false
      return true
    })
  }, [notes, search, statusFilter, templateFilter])

  const hasNotes = notes && notes.length > 0

  return (
    <div className="notes-list-page">
      <header className="notes-list-header">
        <h1>Mes notes d'étude</h1>
        <Link to="/" className="new-note-link">
          + Nouvelle note
        </Link>
      </header>

      {error && <p className="upload-error">{error}</p>}

      {!notes && !error && <p className="notes-loading">Chargement…</p>}

      {notes && notes.length === 0 && (
        <div className="notes-empty">
          <span>📖</span>
          <p>Aucune note pour l'instant.</p>
          <Link to="/">Commence par en créer une</Link>
        </div>
      )}

      {hasNotes && (
        <div className="notes-filters">
          <input
            type="search"
            className="notes-search"
            placeholder="Rechercher par nom de fichier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="notes-status-tabs">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`notes-status-tab ${statusFilter === f.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {templates.length > 0 && (
            <select
              className="notes-template-select"
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
            >
              <option value="ALL">Tous les templates</option>
              <option value="DEFAULT">Structure par défaut</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {hasNotes && filteredNotes && filteredNotes.length === 0 && (
        <p className="notes-loading">Aucune note ne correspond à ces filtres.</p>
      )}

      {filteredNotes && filteredNotes.length > 0 && (
        <div className="notes-grid">
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} templateName={note.templateId ? templateNames.get(note.templateId) : undefined} />
          ))}
        </div>
      )}
    </div>
  )
}
