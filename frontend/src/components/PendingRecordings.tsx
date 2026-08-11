import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { submitNote } from '../api/client'
import { deletePendingRecording, listPendingRecordings, type PendingRecording } from '../offline/pendingRecordings'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { formatDateShort } from '../utils/formatDate'
import './PendingRecordings.css'

export function PendingRecordings({ onSent }: { onSent?: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [items, setItems] = useState<PendingRecording[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setItems(await listPendingRecordings())
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleSend(item: PendingRecording) {
    setSendingId(item.id)
    setError(null)
    try {
      const note = await submitNote(item.blob, item.filename, {
        provider: item.provider,
        modelSize: item.modelSize,
        templateId: item.templateId,
      })
      await deletePendingRecording(item.id)
      onSent?.()
      navigate(`/notes/${note.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('upload.errSendFailed'))
      setSendingId(null)
    }
  }

  async function handleDiscard(item: PendingRecording) {
    if (!window.confirm(t('pending.confirmDiscard'))) return
    await deletePendingRecording(item.id)
    await refresh()
  }

  if (items.length === 0) return null

  return (
    <div className="pending-recordings">
      <div className="pending-recordings-head">
        <strong>{t('pending.title', { count: items.length })}</strong>
        <span className={`pending-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? t('pending.online') : t('pending.offline')}
        </span>
      </div>
      <p className="pending-recordings-hint">{isOnline ? t('pending.hintOnline') : t('pending.hintOffline')}</p>
      {error && <p className="upload-error">{error}</p>}
      <ul className="pending-recordings-list">
        {items.map((item) => (
          <li key={item.id} className="pending-recording-item">
            <div>
              <span className="pending-recording-name">{item.filename}</span>
              <span className="pending-recording-meta">
                {formatDateShort(item.createdAt, i18n.language)} · {item.provider}
              </span>
            </div>
            <div className="pending-recording-actions">
              <button
                type="button"
                className="note-action-button primary"
                onClick={() => handleSend(item)}
                disabled={!isOnline || sendingId === item.id}
              >
                {sendingId === item.id ? t('pending.sending') : t('pending.send')}
              </button>
              <button
                type="button"
                className="note-action-button danger"
                onClick={() => handleDiscard(item)}
                disabled={sendingId === item.id}
              >
                🗑
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
