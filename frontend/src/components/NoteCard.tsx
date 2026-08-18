import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { NoteSummary } from '../types'
import { StatusBadge } from './StatusBadge'
import { formatDateShort } from '../utils/formatDate'
import { backgroundClassName } from '../noteBackgrounds'
import '../styles/noteBackgrounds.css'
import './NoteCard.css'

const IMPORTANCE_ICON: Record<NoteSummary['importance'], string | null> = {
  NORMALE: null,
  IMPORTANTE: '⭐',
  URGENTE: '🔴',
}

export function NoteCard({
  note,
  templateName,
  folders,
  selectable,
  selected,
  onToggleSelect,
}: {
  note: NoteSummary
  templateName?: string
  folders?: Array<{ id: string; name: string; color: string }>
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const { i18n } = useTranslation()
  const importanceIcon = IMPORTANCE_ICON[note.importance]
  const bgClass = backgroundClassName(note.background)

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
        {folders?.map((folder) => (
          <span key={folder.id} className="note-card-folder">
            <span className="note-card-folder-dot" style={{ background: folder.color }} />
            {folder.name}
          </span>
        ))}
      </div>
    </>
  )

  if (selectable) {
    return (
      <div
        className={`note-card note-card-selectable ${bgClass} ${selected ? 'selected' : ''}`}
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
    <Link to={`/notes/${note.id}`} className={`note-card ${bgClass}`}>
      {body}
    </Link>
  )
}
