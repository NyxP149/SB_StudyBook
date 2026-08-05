import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useNote } from '../hooks/useNote'
import { listFolders, organizeNote, updateNote } from '../api/client'
import { NoteMarkdown } from '../components/NoteMarkdown'
import { StatusBadge } from '../components/StatusBadge'
import { extractTheme } from '../utils/noteExcerpt'
import type { Folder, NoteImportance } from '../types'
import './NoteDetailPage.css'

const IMPORTANCE_OPTIONS: Array<{ value: NoteImportance; label: string; icon: string }> = [
  { value: 'NORMALE', label: 'Normale', icon: '⚪' },
  { value: 'IMPORTANTE', label: 'Importante', icon: '⭐' },
  { value: 'URGENTE', label: 'Urgente', icon: '🔴' },
]

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.[^./]+$/, '') + '.md'
  a.click()
  URL.revokeObjectURL(url)
}

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { note, error, setNote } = useNote(id)
  const [showTranscript, setShowTranscript] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [organizeError, setOrganizeError] = useState<string | null>(null)
  type OrganizeTarget = { folderId: string | null; importance: NoteImportance }
  const latestOrganizeTargetRef = useRef<OrganizeTarget | null>(null)
  const queuedOrganizeRef = useRef<OrganizeTarget | null>(null)
  const organizeInFlightRef = useRef(false)

  useEffect(() => {
    listFolders()
      .then(setFolders)
      .catch(() => setFolders([]))
  }, [])

  if (error) {
    return (
      <div className="note-detail-page">
        <p className="upload-error">{error}</p>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="note-detail-page">
        <p className="notes-loading">Chargement…</p>
      </div>
    )
  }

  const theme = extractTheme(note.noteMarkdown)

  function startEditing() {
    setDraft(note!.noteMarkdown ?? '')
    setSaveError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setSaveError(null)
  }

  async function saveEditing() {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateNote(note!.id, draft)
      setNote(updated)
      setIsEditing(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Échec de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  async function handleOrganize(folderId: string | null, importance: NoteImportance) {
    const target = { folderId, importance }
    latestOrganizeTargetRef.current = target
    queuedOrganizeRef.current = target
    setOrganizeError(null)

    if (organizeInFlightRef.current) return
    organizeInFlightRef.current = true
    try {
      // Sends one request at a time, in order: a still-in-flight PATCH could
      // otherwise land after a newer one and silently revert it server-side.
      while (queuedOrganizeRef.current) {
        const toSend = queuedOrganizeRef.current
        queuedOrganizeRef.current = null
        try {
          const updated = await organizeNote(note!.id, toSend.folderId, toSend.importance)
          setNote(updated)
        } catch (e) {
          setOrganizeError(e instanceof Error ? e.message : "Échec de la mise à jour.")
          break
        }
      }
    } finally {
      organizeInFlightRef.current = false
    }
  }

  return (
    <div className="note-detail-page">
      <Link to="/notes" className="back-link no-print">
        ← Toutes les notes
      </Link>

      <header className="note-detail-header">
        <div>
          <h1>{note.originalFilename}</h1>
          {theme && <p className="note-detail-theme">{theme}</p>}
        </div>
        <StatusBadge status={note.status} />
      </header>

      <div className="note-detail-meta">
        <span>{note.provider}</span>
        {note.modelSize && (
          <>
            <span className="dot">·</span>
            <span>{note.modelSize}</span>
          </>
        )}
        <span className="dot">·</span>
        <span>{new Date(note.createdAt).toLocaleString('fr-FR')}</span>
      </div>

      <div className="note-organize-bar no-print">
        <div className="importance-group">
          {IMPORTANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`importance-button imp-${opt.value.toLowerCase()} ${note.importance === opt.value ? 'active' : ''}`}
              onClick={() => handleOrganize(latestOrganizeTargetRef.current?.folderId ?? note.folderId, opt.value)}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
        <select
          className="notes-template-select"
          value={note.folderId ?? ''}
          onChange={(e) => handleOrganize(e.target.value || null, latestOrganizeTargetRef.current?.importance ?? note.importance)}
        >
          <option value="">Sans dossier</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {organizeError && <p className="upload-error no-print">{organizeError}</p>}

      {note.status === 'PENDING' && (
        <div className="note-pending">
          <span className="brew-icon">☕</span>
          <p>Transcription et rédaction en cours…</p>
          <p className="note-pending-sub">Ça peut prendre quelques minutes selon le modèle choisi.</p>
        </div>
      )}

      {note.status === 'FAILED' && (
        <div className="note-failed">
          <strong>Le traitement a échoué</strong>
          <pre>{note.errorMessage}</pre>
        </div>
      )}

      {note.status === 'DONE' && note.noteMarkdown && (
        <>
          <div className="note-detail-actions no-print">
            {isEditing ? (
              <>
                <button type="button" className="note-action-button primary" onClick={saveEditing} disabled={saving}>
                  {saving ? 'Enregistrement…' : '✓ Enregistrer'}
                </button>
                <button type="button" className="note-action-button" onClick={cancelEditing} disabled={saving}>
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button type="button" className="note-action-button" onClick={startEditing}>
                  ✎ Modifier
                </button>
                <button
                  type="button"
                  className="note-action-button"
                  onClick={() => downloadMarkdown(note.originalFilename, note.noteMarkdown!)}
                >
                  ⬇ Télécharger .md
                </button>
                <button type="button" className="note-action-button" onClick={() => window.print()}>
                  🖨 Imprimer / PDF
                </button>
              </>
            )}
          </div>

          {saveError && <p className="upload-error no-print">{saveError}</p>}

          {isEditing ? (
            <textarea
              className="note-edit-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
              rows={20}
            />
          ) : (
            <NoteMarkdown content={note.noteMarkdown} />
          )}

          {note.transcript && (
            <div className="transcript-panel no-print">
              <button type="button" onClick={() => setShowTranscript((v) => !v)} className="transcript-toggle">
                {showTranscript ? '▾' : '▸'} Transcription brute
              </button>
              {showTranscript && <p className="transcript-text">{note.transcript}</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
