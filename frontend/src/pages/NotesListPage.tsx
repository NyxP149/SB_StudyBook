import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteNote, listFolders, listNotes, listTemplates } from '../api/client'
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
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

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

  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelectedIds(new Set())
    setBulkError(null)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllFiltered() {
    setSelectedIds(new Set((filteredNotes ?? []).map((n) => n.id)))
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Supprimer définitivement ${selectedIds.size} note(s) ?`)) return
    setBulkDeleting(true)
    setBulkError(null)
    const ids = [...selectedIds]
    const failed: string[] = []
    for (const id of ids) {
      try {
        await deleteNote(id)
      } catch {
        failed.push(id)
      }
    }
    setNotes((prev) => (prev ? prev.filter((n) => !ids.includes(n.id) || failed.includes(n.id)) : prev))
    setSelectedIds(new Set(failed))
    setBulkDeleting(false)
    if (failed.length > 0) {
      setBulkError(`${failed.length} suppression(s) ont échoué. Réessaie.`)
    } else {
      setSelectMode(false)
    }
  }

  return (
    <div className="notes-list-page">
      <header className="notes-list-header">
        <h1>Mes notes d'étude</h1>
        <div className="notes-list-header-actions">
          {hasNotes && (
            <button type="button" className="notes-status-tab" onClick={toggleSelectMode}>
              {selectMode ? 'Annuler la sélection' : '☑ Sélectionner'}
            </button>
          )}
          <Link to="/" className="new-note-link">
            + Nouvelle note
          </Link>
        </div>
      </header>

      {selectMode && (
        <div className="notes-bulk-bar">
          <span>{selectedIds.size} sélectionnée(s)</span>
          <button type="button" className="notes-status-tab" onClick={selectAllFiltered}>
            Tout sélectionner
          </button>
          <button
            type="button"
            className="note-action-button danger"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || bulkDeleting}
          >
            {bulkDeleting ? 'Suppression…' : `🗑 Supprimer (${selectedIds.size})`}
          </button>
          {bulkError && <span className="upload-error">{bulkError}</span>}
        </div>
      )}

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
                selectable={selectMode}
                selected={selectedIds.has(note.id)}
                onToggleSelect={toggleSelect}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
