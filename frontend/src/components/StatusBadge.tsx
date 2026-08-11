import { useTranslation } from 'react-i18next'
import type { NoteStatus } from '../types'
import './StatusBadge.css'

const KEYS: Record<NoteStatus, string> = {
  PENDING: 'status.pending',
  DONE: 'status.done',
  FAILED: 'status.failed',
}

export function StatusBadge({ status }: { status: NoteStatus }) {
  const { t } = useTranslation()
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {t(KEYS[status])}
    </span>
  )
}
