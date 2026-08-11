import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { NoteSummary } from '../types'
import { StatusBadge } from './StatusBadge'
import { formatDateShort } from '../utils/formatDate'
import './NoteCard.css'

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
  selectable,
  selected,
  onToggleSelect,
}: {
  note: NoteSummary
  templateName?: string
  folderName?: string
  folderColor?: string
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const { i18n } = useTranslation()
  const importanceIcon = IMPORTANCE_ICON[note.importance]

  const body = (
    <>
      <span className={`note-card-tape tape-${note.status.toLowerCase()}`} />
      {selectable && (
        <span className={`note-card-checkbox ${selected ? 'checked' : ''}`}>{selected ? '✓' : ''}</span>
      )}
      <div className="note-card-head">
        <h3>
          {importanceIcon && <span className="note-card-importance">{importanceIcon}</span>}
          {note.originalFilename}
        </h3>
        <StatusBadge status={note.status} />
      </div>
      <div className="note-card-meta">
        <span>{formatDateShort(note.createdAt, i18n.language)}</span>
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
    </>
  )

  if (selectable) {
    return (
      <div
        className={`note-card note-card-selectable ${selected ? 'selected' : ''}`}
        onClick={() => onToggleSelect?.(note.id)}
        role="checkbox"
        aria-checked={selected}
        tabIndex={0}
      >
        {body}
      </div>
    )
  }

  return (
    <Link to={`/notes/${note.id}`} className="note-card">
      {body}
    </Link>
  )
}
