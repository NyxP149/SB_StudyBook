import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listNotes } from '../api/client'
import { NoteCard } from '../components/NoteCard'
import type { NoteSummary } from '../types'
import './NotesListPage.css'

export function NotesListPage() {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listNotes()
      .then((result) => {
        if (!cancelled) setNotes(result)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue')
      })
    return () => {
      cancelled = true
    }
  }, [])

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

      {notes && notes.length > 0 && (
        <div className="notes-grid">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}
