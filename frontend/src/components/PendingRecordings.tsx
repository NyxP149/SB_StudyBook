import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitNote } from '../api/client'
import { deletePendingRecording, listPendingRecordings, type PendingRecording } from '../offline/pendingRecordings'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import './PendingRecordings.css'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function PendingRecordings({ onSent }: { onSent?: () => void }) {
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
      setError(e instanceof Error ? e.message : "Échec de l'envoi.")
      setSendingId(null)
    }
  }

  async function handleDiscard(item: PendingRecording) {
    if (!window.confirm('Supprimer cet enregistrement en attente ?')) return
    await deletePendingRecording(item.id)
    await refresh()
  }

  if (items.length === 0) return null

  return (
    <div className="pending-recordings">
      <div className="pending-recordings-head">
        <strong>🎙️ Enregistrements en attente ({items.length})</strong>
        <span className={`pending-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '● En ligne' : '○ Hors ligne'}
        </span>
      </div>
      <p className="pending-recordings-hint">
        {isOnline
          ? "Envoie-les manuellement quand tu veux : rien n'est envoyé automatiquement."
          : 'Enregistrés localement — ils seront prêts à envoyer dès que tu retrouves une connexion.'}
      </p>
      {error && <p className="upload-error">{error}</p>}
      <ul className="pending-recordings-list">
        {items.map((item) => (
          <li key={item.id} className="pending-recording-item">
            <div>
              <span className="pending-recording-name">{item.filename}</span>
              <span className="pending-recording-meta">
                {formatDate(item.createdAt)} · {item.provider}
              </span>
            </div>
            <div className="pending-recording-actions">
              <button
                type="button"
                className="note-action-button primary"
                onClick={() => handleSend(item)}
                disabled={!isOnline || sendingId === item.id}
              >
                {sendingId === item.id ? 'Envoi…' : '📤 Envoyer'}
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
