import type {
  Folder,
  FolderInput,
  Note,
  NoteImportance,
  NoteSummary,
  SubmitOptions,
  SubmitTextOptions,
  Template,
  TemplateInput,
} from '../types'

const NOTES_URL = '/api/notes'
const TEMPLATES_URL = '/api/templates'
const FOLDERS_URL = '/api/folders'

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

export async function submitTextNote(
  input: { text?: string; file?: File },
  options: SubmitTextOptions = {},
): Promise<Note> {
  const formData = new FormData()
  if (input.file) formData.append('file', input.file)
  else if (input.text) formData.append('text', input.text)
  if (options.provider) formData.append('provider', options.provider)
  if (options.templateId) formData.append('templateId', options.templateId)

  const response = await fetch(`${NOTES_URL}/from-text`, { method: 'POST', body: formData })
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

export async function updateNote(id: string, noteMarkdown: string): Promise<Note> {
  const response = await fetch(`${NOTES_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteMarkdown }),
  })
  return parseOrThrow<Note>(response)
}

export async function organizeNote(id: string, folderId: string | null, importance: NoteImportance): Promise<Note> {
  const response = await fetch(`${NOTES_URL}/${id}/organize`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId, importance }),
  })
  return parseOrThrow<Note>(response)
}

export async function listFolders(): Promise<Folder[]> {
  const response = await fetch(FOLDERS_URL)
  return parseOrThrow<Folder[]>(response)
}

export async function createFolder(input: FolderInput): Promise<Folder> {
  const response = await fetch(FOLDERS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<Folder>(response)
}

export async function updateFolder(id: string, input: FolderInput): Promise<Folder> {
  const response = await fetch(`${FOLDERS_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<Folder>(response)
}

export async function deleteFolder(id: string): Promise<void> {
  const response = await fetch(`${FOLDERS_URL}/${id}`, { method: 'DELETE' })
  return parseOrThrow<void>(response)
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
