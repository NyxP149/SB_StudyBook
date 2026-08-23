import { ApiError, getNote } from '../api/client'
import { deletePendingRecording, listPendingRecordings, updatePendingRecording } from './pendingRecordings'

// Confronte chaque enregistrement local "en cours" (state === 'processing') au statut
// réel de la note qu'il a créée : terminée -> la copie locale n'a plus d'utilité,
// échouée -> conservée et marquée pour permettre un nouvel essai depuis le même blob.
// Toute erreur autre qu'un 404 (hors-ligne, 5xx transitoire...) est ignorée : on
// réessaiera au prochain appel plutôt que de perdre la copie locale par erreur.
export async function reconcilePendingRecordings(): Promise<void> {
  const items = await listPendingRecordings()

  for (const item of items) {
    if (item.state !== 'processing' || !item.linkedNoteId) {
      continue
    }
    try {
      const note = await getNote(item.linkedNoteId)
      if (note.status === 'DONE') {
        await deletePendingRecording(item.id)
      } else if (note.status === 'FAILED') {
        await updatePendingRecording(item.id, { state: 'failed' })
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        await deletePendingRecording(item.id)
      }
    }
  }
}
