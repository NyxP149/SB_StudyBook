import { Link } from 'react-router-dom'
import type { NoteSummary } from '../types'
import { StatusBadge } from './StatusBadge'
import './NoteCard.css'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NoteCard({ note }: { note: NoteSummary }) {
  return (
    <Link to={`/notes/${note.id}`} className="note-card">
      <span className={`note-card-tape tape-${note.status.toLowerCase()}`} />
      <div className="note-card-head">
        <h3>{note.originalFilename}</h3>
        <StatusBadge status={note.status} />
      </div>
      <div className="note-card-meta">
        <span>{formatDate(note.createdAt)}</span>
        <span className="dot">·</span>
        <span>{note.provider}</span>
        <span className="dot">·</span>
        <span>{note.modelSize}</span>
      </div>
    </Link>
  )
}
