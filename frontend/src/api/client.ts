import type { Note, NoteSummary, SubmitOptions, Template, TemplateInput } from '../types'

const NOTES_URL = '/api/notes'
const TEMPLATES_URL = '/api/templates'

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
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function submitNote(audio: File | Blob, filename: string, options: SubmitOptions = {}): Promise<Note> {
  const formData = new FormData()
  formData.append('audio', audio, filename)
  if (options.provider) formData.append('provider', options.provider)
  if (options.modelSize) formData.append('modelSize', options.modelSize)
  if (options.templateId) formData.append('templateId', options.templateId)

  const response = await fetch(NOTES_URL, { method: 'POST', body: formData })
  return parseOrThrow<Note>(response)
}

export async function listNotes(): Promise<NoteSummary[]> {
  const response = await fetch(NOTES_URL)
  return parseOrThrow<NoteSummary[]>(response)
}

export async function getNote(id: string): Promise<Note> {
  const response = await fetch(`${NOTES_URL}/${id}`)
  return parseOrThrow<Note>(response)
}

export async function listTemplates(): Promise<Template[]> {
  const response = await fetch(TEMPLATES_URL)
  return parseOrThrow<Template[]>(response)
}

export async function createTemplate(input: TemplateInput): Promise<Template> {
  const response = await fetch(TEMPLATES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<Template>(response)
}

export async function updateTemplate(id: string, input: TemplateInput): Promise<Template> {
  const response = await fetch(`${TEMPLATES_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<Template>(response)
}

export async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`${TEMPLATES_URL}/${id}`, { method: 'DELETE' })
  return parseOrThrow<void>(response)
}
