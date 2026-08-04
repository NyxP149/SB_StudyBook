import type { NoteStatus } from '../types'
import './StatusBadge.css'

const LABELS: Record<NoteStatus, string> = {
  PENDING: 'En cours',
  DONE: 'Terminée',
  FAILED: 'Échec',
}

export function StatusBadge({ status }: { status: NoteStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {LABELS[status]}
    </span>
  )
}
