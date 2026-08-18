import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  addNoteToFolder,
  deleteNote,
  listFolderNotes,
  listFolders,
  listNotes,
  removeNoteFromFolder,
} from '../api/client'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateShort } from '../utils/formatDate'
import type { Folder, NoteSummary } from '../types'
import './FolderDetailPage.css'

export function FolderDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [folder, setFolder] = useState<Folder | null>(null)
  const [notes, setNotes] = useState<NoteSummary[] | null>(null)
  const [allNotes, setAllNotes] = useState<NoteSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [adding, setAdding] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const refresh = () => {
    if (!id) return
    listFolderNotes(id)
      .then(setNotes)
      .catch((e) => setError(e instanceof Error ? e.message : t('common.unknownError')))
  }

  useEffect(() => {
    if (!id) return
    listFolders()
      .then((folders) => setFolder(folders.find((f) => f.id === id) ?? null))
      .catch(() => setFolder(null))
    listNotes()
      .then(setAllNotes)
      .catch(() => setAllNotes([]))
    refresh()
  }, [id])

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
      refresh()
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
      refresh()
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
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.deleteFailed'))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="folder-detail-page">
      <Link to="/folders" className="back-link no-print">
        {t('folders.backLink')}
      </Link>

      <header className="folder-detail-header">
        {folder && <span className="folder-swatch" style={{ background: folder.color }} />}
        <h1>{folder?.name ?? '…'}</h1>
      </header>

      {error && <p className="upload-error">{error}</p>}

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

      {!notes && !error && <p className="notes-loading">{t('common.loading')}</p>}

      {notes && notes.length === 0 && <p className="notes-loading">{t('folders.emptyContent')}</p>}

      {notes && notes.length > 0 && (
        <div className="folder-detail-list">
          {notes.map((note) => (
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
    </div>
  )
}
