import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useNote } from '../hooks/useNote'
import { NoteMarkdown } from '../components/NoteMarkdown'
import { StatusBadge } from '../components/StatusBadge'
import { extractTheme } from '../utils/noteExcerpt'
import './NoteDetailPage.css'

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { note, error } = useNote(id)
  const [showTranscript, setShowTranscript] = useState(false)

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

  return (
    <div className="note-detail-page">
      <Link to="/notes" className="back-link">
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
          <NoteMarkdown content={note.noteMarkdown} />

          {note.transcript && (
            <div className="transcript-panel">
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
