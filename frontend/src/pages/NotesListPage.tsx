import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listFolders, listNotes, listTemplates } from '../api/client'
import { NoteCard } from '../components/NoteCard'
import type { Folder, NoteImportance, NoteStatus, NoteSummary, Template } from '../types'
import './NotesListPage.css'

const STATUS_FILTERS: Array<{ value: NoteStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'PENDING', label: 'En cours' },
  { value: 'DONE', label: 'Terminées' },
  { value: 'FAILED', label: 'Échecs' },
]

const IMPORTANCE_RANK: Record<NoteImportance, number> = { URGENTE: 0, IMPORTANTE: 1, NORMALE: 2 }

export function NotesListPage() {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<NoteStatus | 'ALL'>('ALL')
  const [templateFilter, setTemplateFilter] = useState('ALL')
  const [folderFilter, setFolderFilter] = useState('ALL')
  const [sortByImportance, setSortByImportance] = useState(false)

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
    listFolders()
      .then((result) => {
        if (!cancelled) setFolders(result)
      })
      .catch(() => {
        if (!cancelled) setFolders([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const templateNames = useMemo(() => new Map(templates.map((t) => [t.id, t.name])), [templates])
  const foldersById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders])

  const filteredNotes = useMemo(() => {
    if (!notes) return null
    const query = search.trim().toLowerCase()
    const result = notes.filter((note) => {
      if (statusFilter !== 'ALL' && note.status !== statusFilter) return false
      if (templateFilter !== 'ALL') {
        if (templateFilter === 'DEFAULT' ? note.templateId !== null : note.templateId !== templateFilter) return false
      }
      if (folderFilter !== 'ALL') {
        if (folderFilter === 'NONE' ? note.folderId !== null : note.folderId !== folderFilter) return false
      }
      if (query && !note.originalFilename.toLowerCase().includes(query)) return false
      return true
    })
    if (sortByImportance) {
      return [...result].sort((a, b) => IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance])
    }
    return result
  }, [notes, search, statusFilter, templateFilter, folderFilter, sortByImportance])

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
          {folders.length > 0 && (
            <select
              className="notes-template-select"
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
            >
              <option value="ALL">Tous les dossiers</option>
              <option value="NONE">Sans dossier</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className={`notes-status-tab importance-sort-toggle ${sortByImportance ? 'active' : ''}`}
            onClick={() => setSortByImportance((v) => !v)}
          >
            🔴 Trier par importance
          </button>
        </div>
      )}

      {hasNotes && filteredNotes && filteredNotes.length === 0 && (
        <p className="notes-loading">Aucune note ne correspond à ces filtres.</p>
      )}

      {filteredNotes && filteredNotes.length > 0 && (
        <div className="notes-grid">
          {filteredNotes.map((note) => {
            const folder = note.folderId ? foldersById.get(note.folderId) : undefined
            return (
              <NoteCard
                key={note.id}
                note={note}
                templateName={note.templateId ? templateNames.get(note.templateId) : undefined}
                folderName={folder?.name}
                folderColor={folder?.color}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
