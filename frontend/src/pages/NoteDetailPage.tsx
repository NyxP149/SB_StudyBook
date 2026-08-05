import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useNote } from '../hooks/useNote'
import { updateNote } from '../api/client'
import { NoteMarkdown } from '../components/NoteMarkdown'
import { StatusBadge } from '../components/StatusBadge'
import { extractTheme } from '../utils/noteExcerpt'
import './NoteDetailPage.css'

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
        <span className="dot">·</span>
        <span>{note.modelSize}</span>
        <span className="dot">·</span>
        <span>{new Date(note.createdAt).toLocaleString('fr-FR')}</span>
      </div>

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
