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

const IMPORTANCE_ICON: Record<NoteSummary['importance'], string | null> = {
  NORMALE: null,
  IMPORTANTE: '⭐',
  URGENTE: '🔴',
}

export function NoteCard({
  note,
  templateName,
  folderName,
  folderColor,
}: {
  note: NoteSummary
  templateName?: string
  folderName?: string
  folderColor?: string
}) {
  const importanceIcon = IMPORTANCE_ICON[note.importance]

  return (
    <Link to={`/notes/${note.id}`} className="note-card">
      <span className={`note-card-tape tape-${note.status.toLowerCase()}`} />
      <div className="note-card-head">
        <h3>
          {importanceIcon && <span className="note-card-importance">{importanceIcon}</span>}
          {note.originalFilename}
        </h3>
        <StatusBadge status={note.status} />
      </div>
      <div className="note-card-meta">
        <span>{formatDate(note.createdAt)}</span>
        <span className="dot">·</span>
        <span>{note.provider}</span>
        {note.modelSize && (
          <>
            <span className="dot">·</span>
            <span>{note.modelSize}</span>
          </>
        )}
      </div>
      <div className="note-card-tags">
        {templateName && <span className="note-card-template">{templateName}</span>}
        {folderName && (
          <span className="note-card-folder">
            <span className="note-card-folder-dot" style={{ background: folderColor }} />
            {folderName}
          </span>
        )}
      </div>
    </Link>
  )
}
