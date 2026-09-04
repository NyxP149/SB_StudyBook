import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  addNoteToFolder,
  createFolder,
  deleteFolder,
  deleteNote,
  listFolderNotes,
  listFolders,
  listNotes,
  removeNoteFromFolder,
  updateFolder,
} from '../api/client'
import { StatusBadge } from '../components/StatusBadge'
import { FOLDER_COLOR_PRESETS } from '../folderColors'
import { formatDateShort } from '../utils/formatDate'
import type { Folder, FolderInput, NoteImportance, NoteSummary } from '../types'
import './FolderDetailPage.css'
import './FoldersPage.css'

const IMPORTANCE_RANK: Record<NoteImportance, number> = { URGENTE: 0, IMPORTANTE: 1, NORMALE: 2 }

type SortKey = 'name' | 'dateNewest' | 'dateOldest' | 'importance'

const SORT_OPTIONS: Array<{ value: SortKey; labelKey: string }> = [
  { value: 'name', labelKey: 'folders.sortName' },
  { value: 'dateNewest', labelKey: 'folders.sortDateNewest' },
  { value: 'dateOldest', labelKey: 'folders.sortDateOldest' },
  { value: 'importance', labelKey: 'folders.sortImportance' },
]

function sortNotes(notes: NoteSummary[], sortKey: SortKey): NoteSummary[] {
  const sorted = [...notes]
  switch (sortKey) {
    case 'name':
      sorted.sort((a, b) => a.originalFilename.localeCompare(b.originalFilename))
      break
    case 'dateNewest':
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'dateOldest':
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      break
    case 'importance':
      sorted.sort((a, b) => IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance])
      break
  }
  return sorted
}

function emptySubfolderForm(parentId: string): FolderInput {
  return { name: '', color: FOLDER_COLOR_PRESETS[0].hex, parentId }
}

export function FolderDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [folders, setFolders] = useState<Folder[]>([])
  const [notes, setNotes] = useState<NoteSummary[] | null>(null)
  const [allNotes, setAllNotes] = useState<NoteSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [adding, setAdding] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [subfoldersFirst, setSubfoldersFirst] = useState(true)
  const [subfolderForm, setSubfolderForm] = useState<FolderInput | null>(null)
  const [editingSubfolderId, setEditingSubfolderId] = useState<string | null>(null)
  const [savingSubfolder, setSavingSubfolder] = useState(false)

  const refreshNotes = () => {
    if (!id) return
    listFolderNotes(id)
      .then(setNotes)
      .catch((e) => setError(e instanceof Error ? e.message : t('common.unknownError')))
  }

  const refreshFolders = () => {
    listFolders()
      .then(setFolders)
      .catch(() => setFolders([]))
  }

  useEffect(() => {
    if (!id) return
    refreshFolders()
    listNotes()
      .then(setAllNotes)
      .catch(() => setAllNotes([]))
    refreshNotes()
  }, [id])

  const folder = useMemo(() => folders.find((f) => f.id === id) ?? null, [folders, id])
  const subfolders = useMemo(() => folders.filter((f) => f.parentId === id), [folders, id])

  const breadcrumb = useMemo(() => {
    if (!folder) return []
    const byId = new Map(folders.map((f) => [f.id, f]))
    const chain: Folder[] = []
    let current: Folder | undefined = folder
    while (current) {
      chain.unshift(current)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return chain
  }, [folder, folders])

  const sortedNotes = useMemo(() => sortNotes(notes ?? [], sortKey), [notes, sortKey])

  const availableNotes = useMemo(() => {
    const inFolder = new Set((notes ?? []).map((n) => n.id))
    return allNotes.filter((n) => !inFolder.has(n.id))
  }, [allNotes, notes])

  async function handleAdd() {
    if (!id || !selectedNoteId) return
    setAdding(true)
    setError(null)
    try {
      await addNoteToFolder(id, selectedNoteId)
      setSelectedNoteId('')
      refreshNotes()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(noteId: string) {
    if (!id) return
    setPendingId(noteId)
    setError(null)
    try {
      await removeNoteFromFolder(id, noteId)
      refreshNotes()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setPendingId(null)
    }
  }

  async function handleDeleteForever(noteId: string) {
    if (!window.confirm(t('folders.confirmDeleteForever'))) return
    setPendingId(noteId)
    setError(null)
    try {
      await deleteNote(noteId)
      refreshNotes()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.deleteFailed'))
    } finally {
      setPendingId(null)
    }
  }

  function startCreateSubfolder() {
    if (!id) return
    setEditingSubfolderId(null)
    setSubfolderForm(emptySubfolderForm(id))
    setError(null)
  }

  function startEditSubfolder(sf: Folder) {
    setEditingSubfolderId(sf.id)
    setSubfolderForm({ name: sf.name, color: sf.color, parentId: sf.parentId })
    setError(null)
  }

  function cancelSubfolderForm() {
    setSubfolderForm(null)
    setEditingSubfolderId(null)
  }

  async function saveSubfolder() {
    if (!subfolderForm) return
    setSavingSubfolder(true)
    setError(null)
    try {
      if (editingSubfolderId) {
        await updateFolder(editingSubfolderId, subfolderForm)
      } else {
        await createFolder(subfolderForm)
      }
      cancelSubfolderForm()
      refreshFolders()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setSavingSubfolder(false)
    }
  }

  async function removeSubfolder(subId: string) {
    if (!window.confirm(t('folders.confirmDeleteFolder'))) return
    setError(null)
    try {
      await deleteFolder(subId)
      if (editingSubfolderId === subId) cancelSubfolderForm()
      refreshFolders()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.deleteFailed'))
    }
  }

  const subfoldersSection = (
    <div className="folder-detail-subfolders">
      <div className="folder-detail-subfolders-header">
        <h2>{t('folders.subfolders')}</h2>
        {!subfolderForm && (
          <button type="button" className="note-action-button" onClick={startCreateSubfolder}>
            {t('folders.newSubfolder')}
          </button>
        )}
      </div>

      {subfolders.length > 0 && (
        <div className="folders-grid">
          {subfolders.map((sf) => (
            <div key={sf.id} className="folder-card">
              <Link to={`/folders/${sf.id}`} className="folder-card-open">
                <span className="folder-swatch" style={{ background: sf.color }} />
                <h3>{sf.name}</h3>
              </Link>
              <button
                type="button"
                className="folder-card-edit"
                onClick={() => startEditSubfolder(sf)}
                aria-label={t('folders.edit')}
                title={t('folders.edit')}
              >
                ✎
              </button>
            </div>
          ))}
        </div>
      )}

      {subfolderForm && (
        <div className="template-form">
          <label className="template-field">
            {t('common.name')}
            <input
              type="text"
              value={subfolderForm.name}
              onChange={(e) => setSubfolderForm((f) => (f ? { ...f, name: e.target.value } : f))}
              placeholder={t('folders.namePlaceholder')}
            />
          </label>
          <div className="template-field">
            {t('folders.color')}
            <div className="folder-color-picker">
              {FOLDER_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  className={`folder-color-swatch ${subfolderForm.color === preset.hex ? 'selected' : ''}`}
                  style={{ background: preset.hex }}
                  aria-label={t(preset.nameKey)}
                  onClick={() => setSubfolderForm((f) => (f ? { ...f, color: preset.hex } : f))}
                />
              ))}
            </div>
          </div>
          <div className="template-form-actions">
            {editingSubfolderId && (
              <button
                type="button"
                className="delete-template-button"
                onClick={() => removeSubfolder(editingSubfolderId)}
              >
                {t('common.delete')}
              </button>
            )}
            <div className="template-form-actions-right">
              <button type="button" className="cancel-button" onClick={cancelSubfolderForm}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="save-button"
                onClick={saveSubfolder}
                disabled={savingSubfolder || !subfolderForm.name.trim()}
              >
                {savingSubfolder ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const notesSection = (
    <>
      <div className="folder-detail-add">
        <select value={selectedNoteId} onChange={(e) => setSelectedNoteId(e.target.value)} disabled={adding}>
          <option value="">{t('folders.addNotePlaceholder')}</option>
          {availableNotes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.originalFilename}
            </option>
          ))}
        </select>
        <button type="button" className="note-action-button primary" onClick={handleAdd} disabled={adding || !selectedNoteId}>
          {t('folders.addNoteButton')}
        </button>
        {availableNotes.length === 0 && allNotes.length > 0 && (
          <span className="folder-detail-add-hint">{t('folders.noNotesToAdd')}</span>
        )}
      </div>

      {notes && notes.length > 0 && (
        <div className="folder-detail-sort-bar">
          <select
            className="notes-template-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label={t('folders.sortNotesBy')}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>
      )}

      {!notes && !error && <p className="notes-loading">{t('common.loading')}</p>}

      {notes && notes.length === 0 && <p className="notes-loading">{t('folders.emptyContent')}</p>}

      {notes && notes.length > 0 && (
        <div className="folder-detail-list">
          {sortedNotes.map((note) => (
            <div key={note.id} className="folder-detail-row">
              <Link to={`/notes/${note.id}`} className="folder-detail-row-main">
                <span className="folder-detail-row-title">{note.originalFilename}</span>
                <span className="folder-detail-row-meta">
                  <StatusBadge status={note.status} />
                  <span className="dot">·</span>
                  {formatDateShort(note.createdAt, i18n.language)}
                </span>
              </Link>
              <div className="folder-detail-row-actions">
                <button
                  type="button"
                  className="note-action-button"
                  onClick={() => handleRemove(note.id)}
                  disabled={pendingId === note.id}
                >
                  {t('folders.removeFromFolder')}
                </button>
                <button
                  type="button"
                  className="note-action-button danger"
                  onClick={() => handleDeleteForever(note.id)}
                  disabled={pendingId === note.id}
                >
                  {t('folders.deleteForever')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  return (
    <div className="folder-detail-page">
      <Link to="/folders" className="back-link no-print">
        {t('folders.backLink')}
      </Link>

      {breadcrumb.length > 1 && (
        <nav className="folder-breadcrumb no-print">
          {breadcrumb.map((crumb, index) => (
            <span key={crumb.id} className="folder-breadcrumb-item">
              {index > 0 && <span className="folder-breadcrumb-sep">/</span>}
              {index === breadcrumb.length - 1 ? (
                <span className="folder-breadcrumb-current">{crumb.name}</span>
              ) : (
                <Link to={`/folders/${crumb.id}`}>{crumb.name}</Link>
              )}
            </span>
          ))}
        </nav>
      )}

      <header className="folder-detail-header">
        {folder && <span className="folder-swatch" style={{ background: folder.color }} />}
        <h1>{folder?.name ?? '…'}</h1>
      </header>

      {error && <p className="upload-error">{error}</p>}

      <label className="folder-detail-subfolders-first no-print">
        <input type="checkbox" checked={subfoldersFirst} onChange={(e) => setSubfoldersFirst(e.target.checked)} />
        {t('folders.subfoldersFirst')}
      </label>

      {subfoldersFirst ? (
        <>
          {subfoldersSection}
          {notesSection}
        </>
      ) : (
        <>
          {notesSection}
          {subfoldersSection}
        </>
      )}
    </div>
  )
}
