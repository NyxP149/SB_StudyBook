import type { Note, NoteSummary, SubmitOptions } from '../types'

const BASE_URL = '/api/notes'

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Erreur ${response.status}`
    try {
      const body = await response.json()
      message = body.message ?? message
    } catch {
      // pas de corps JSON, on garde le message par défaut
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export async function submitNote(audio: File | Blob, filename: string, options: SubmitOptions = {}): Promise<Note> {
  const formData = new FormData()
  formData.append('audio', audio, filename)
  if (options.provider) formData.append('provider', options.provider)
  if (options.modelSize) formData.append('modelSize', options.modelSize)

  const response = await fetch(BASE_URL, { method: 'POST', body: formData })
  return parseOrThrow<Note>(response)
}

export async function listNotes(): Promise<NoteSummary[]> {
  const response = await fetch(BASE_URL)
  return parseOrThrow<NoteSummary[]>(response)
}

export async function getNote(id: string): Promise<Note> {
  const response = await fetch(`${BASE_URL}/${id}`)
  return parseOrThrow<Note>(response)
}
