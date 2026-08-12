import type {
  Folder,
  FolderInput,
  Note,
  NoteImportance,
  NoteSummary,
  StudyArgument,
  StudyArgumentInput,
  StudyArgumentNote,
  StudyImage,
  StudyProgram,
  StudyProgramInput,
  StudyUpcoming,
  SubmitOptions,
  SubmitTextOptions,
  Template,
  TemplateInput,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const AUTH_URL = `${API_BASE}/api/auth`
const NOTES_URL = `${API_BASE}/api/notes`
const TEMPLATES_URL = `${API_BASE}/api/templates`
const FOLDERS_URL = `${API_BASE}/api/folders`
const HEALTH_URL = `${API_BASE}/api/health`
const STUDY_URL = `${API_BASE}/api/study`
const NOTE_IMAGES_URL = `${API_BASE}/api/note-images`

// Distingue une vraie réponse du serveur (même en erreur) d'un échec réseau
// (fetch() qui rejette avant d'obtenir une Response, ex: hors ligne) — les
// deux ne doivent pas être traités pareil (voir AuthContext).
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

function authHeaders(): HeadersInit {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {}
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    onUnauthorized?.()
  }
  if (!response.ok) {
    let message = `Erreur ${response.status}`
    try {
      const body = await response.json()
      message = body.message ?? message
    } catch {
      // pas de corps JSON, on garde le message par défaut
    }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, headers: { ...init.headers, ...authHeaders() } })
}

/** Vérifie que le backend répond vraiment — navigator.onLine ne reflète que
 * l'état de l'interface réseau, pas la joignabilité réelle du serveur. */
export async function pingServer(timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(HEALTH_URL, { signal: controller.signal, cache: 'no-store' })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export interface AuthResult {
  token: string
  username: string
}

export async function register(username: string, password: string): Promise<AuthResult> {
  const response = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return parseOrThrow<AuthResult>(response)
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const response = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return parseOrThrow<AuthResult>(response)
}

export async function logout(): Promise<void> {
  await authFetch(`${AUTH_URL}/logout`, { method: 'POST' })
}

export async function getMe(): Promise<{ username: string }> {
  const response = await authFetch(`${AUTH_URL}/me`)
  return parseOrThrow<{ username: string }>(response)
}

export async function submitNote(audio: File | Blob, filename: string, options: SubmitOptions = {}): Promise<Note> {
  const formData = new FormData()
  formData.append('audio', audio, filename)
  if (options.provider) formData.append('provider', options.provider)
  if (options.modelSize) formData.append('modelSize', options.modelSize)
  if (options.templateId) formData.append('templateId', options.templateId)

  const response = await authFetch(NOTES_URL, { method: 'POST', body: formData })
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

  const response = await authFetch(`${NOTES_URL}/from-text`, { method: 'POST', body: formData })
  return parseOrThrow<Note>(response)
}

export async function listNotes(): Promise<NoteSummary[]> {
  const response = await authFetch(NOTES_URL)
  return parseOrThrow<NoteSummary[]>(response)
}

export async function getNote(id: string): Promise<Note> {
  const response = await authFetch(`${NOTES_URL}/${id}`)
  return parseOrThrow<Note>(response)
}

export async function updateNote(id: string, noteMarkdown: string): Promise<Note> {
  const response = await authFetch(`${NOTES_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteMarkdown }),
  })
  return parseOrThrow<Note>(response)
}

export async function deleteNote(id: string): Promise<void> {
  const response = await authFetch(`${NOTES_URL}/${id}`, { method: 'DELETE' })
  return parseOrThrow<void>(response)
}

export async function organizeNote(id: string, folderId: string | null, importance: NoteImportance): Promise<Note> {
  const response = await authFetch(`${NOTES_URL}/${id}/organize`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId, importance }),
  })
  return parseOrThrow<Note>(response)
}

export async function updateNoteBackground(id: string, background: string | null): Promise<Note> {
  const response = await authFetch(`${NOTES_URL}/${id}/background`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ background }),
  })
  return parseOrThrow<Note>(response)
}

export async function confirmNoteLink(id: string): Promise<Note> {
  const response = await authFetch(`${NOTES_URL}/${id}/link/confirm`, { method: 'PATCH' })
  return parseOrThrow<Note>(response)
}

export async function dismissNoteLink(id: string): Promise<Note> {
  const response = await authFetch(`${NOTES_URL}/${id}/link/dismiss`, { method: 'PATCH' })
  return parseOrThrow<Note>(response)
}

export async function listFolders(): Promise<Folder[]> {
  const response = await authFetch(FOLDERS_URL)
  return parseOrThrow<Folder[]>(response)
}

export async function createFolder(input: FolderInput): Promise<Folder> {
  const response = await authFetch(FOLDERS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<Folder>(response)
}

export async function updateFolder(id: string, input: FolderInput): Promise<Folder> {
  const response = await authFetch(`${FOLDERS_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<Folder>(response)
}

export async function deleteFolder(id: string): Promise<void> {
  const response = await authFetch(`${FOLDERS_URL}/${id}`, { method: 'DELETE' })
  return parseOrThrow<void>(response)
}

export async function listTemplates(): Promise<Template[]> {
  const response = await authFetch(TEMPLATES_URL)
  return parseOrThrow<Template[]>(response)
}

export async function createTemplate(input: TemplateInput): Promise<Template> {
  const response = await authFetch(TEMPLATES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<Template>(response)
}

export async function updateTemplate(id: string, input: TemplateInput): Promise<Template> {
  const response = await authFetch(`${TEMPLATES_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<Template>(response)
}

export async function deleteTemplate(id: string): Promise<void> {
  const response = await authFetch(`${TEMPLATES_URL}/${id}`, { method: 'DELETE' })
  return parseOrThrow<void>(response)
}

export async function listStudyPrograms(): Promise<StudyProgram[]> {
  const response = await authFetch(`${STUDY_URL}/programs`)
  return parseOrThrow<StudyProgram[]>(response)
}

export async function createStudyProgram(input: StudyProgramInput): Promise<StudyProgram> {
  const response = await authFetch(`${STUDY_URL}/programs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<StudyProgram>(response)
}

export async function updateStudyProgram(id: string, input: StudyProgramInput): Promise<StudyProgram> {
  const response = await authFetch(`${STUDY_URL}/programs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<StudyProgram>(response)
}

export async function deleteStudyProgram(id: string): Promise<void> {
  const response = await authFetch(`${STUDY_URL}/programs/${id}`, { method: 'DELETE' })
  return parseOrThrow<void>(response)
}

export async function listStudyArguments(programId: string): Promise<StudyArgument[]> {
  const response = await authFetch(`${STUDY_URL}/programs/${programId}/arguments`)
  return parseOrThrow<StudyArgument[]>(response)
}

export async function getStudyArgument(id: string): Promise<StudyArgument> {
  const response = await authFetch(`${STUDY_URL}/arguments/${id}`)
  return parseOrThrow<StudyArgument>(response)
}

export async function createStudyArgument(programId: string, input: StudyArgumentInput): Promise<StudyArgument> {
  const response = await authFetch(`${STUDY_URL}/programs/${programId}/arguments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<StudyArgument>(response)
}

export async function createStudyArgumentsBulk(
  programId: string,
  inputs: StudyArgumentInput[],
): Promise<StudyArgument[]> {
  const response = await authFetch(`${STUDY_URL}/programs/${programId}/arguments/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arguments: inputs }),
  })
  return parseOrThrow<StudyArgument[]>(response)
}

export async function updateStudyArgument(id: string, input: StudyArgumentInput): Promise<StudyArgument> {
  const response = await authFetch(`${STUDY_URL}/arguments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseOrThrow<StudyArgument>(response)
}

export async function deleteStudyArgument(id: string): Promise<void> {
  const response = await authFetch(`${STUDY_URL}/arguments/${id}`, { method: 'DELETE' })
  return parseOrThrow<void>(response)
}

export async function listStudyUpcoming(): Promise<StudyUpcoming[]> {
  const response = await authFetch(`${STUDY_URL}/upcoming`)
  return parseOrThrow<StudyUpcoming[]>(response)
}

export async function uploadStudyImage(argumentId: string, file: File): Promise<StudyImage> {
  const formData = new FormData()
  formData.append('image', file)
  const response = await authFetch(`${STUDY_URL}/arguments/${argumentId}/images`, { method: 'POST', body: formData })
  return parseOrThrow<StudyImage>(response)
}

export async function listStudyImages(argumentId: string): Promise<StudyImage[]> {
  const response = await authFetch(`${STUDY_URL}/arguments/${argumentId}/images`)
  return parseOrThrow<StudyImage[]>(response)
}

export async function deleteStudyImage(id: string): Promise<void> {
  const response = await authFetch(`${STUDY_URL}/images/${id}`, { method: 'DELETE' })
  return parseOrThrow<void>(response)
}

/** Renvoie une blob: URL locale — l'image est servie derrière l'auth, donc
 * impossible d'utiliser directement son URL dans un <img src>. */
export async function fetchStudyImageObjectUrl(id: string): Promise<string> {
  const response = await authFetch(`${STUDY_URL}/images/${id}`)
  if (!response.ok) throw new ApiError(response.status, `Erreur ${response.status}`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export async function uploadNoteImage(file: File): Promise<{ id: string }> {
  const formData = new FormData()
  formData.append('image', file)
  const response = await authFetch(NOTE_IMAGES_URL, { method: 'POST', body: formData })
  return parseOrThrow<{ id: string }>(response)
}

export async function fetchNoteImageObjectUrl(id: string): Promise<string> {
  const response = await authFetch(`${NOTE_IMAGES_URL}/${id}`)
  if (!response.ok) throw new ApiError(response.status, `Erreur ${response.status}`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export async function listStudyArgumentNotes(argumentId: string): Promise<StudyArgumentNote[]> {
  const response = await authFetch(`${STUDY_URL}/arguments/${argumentId}/notes`)
  return parseOrThrow<StudyArgumentNote[]>(response)
}

export async function createStudyArgumentNote(argumentId: string, content: string): Promise<StudyArgumentNote> {
  const response = await authFetch(`${STUDY_URL}/arguments/${argumentId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  return parseOrThrow<StudyArgumentNote>(response)
}

export async function updateStudyArgumentNote(id: string, content: string): Promise<StudyArgumentNote> {
  const response = await authFetch(`${STUDY_URL}/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  return parseOrThrow<StudyArgumentNote>(response)
}

export async function deleteStudyArgumentNote(id: string): Promise<void> {
  const response = await authFetch(`${STUDY_URL}/notes/${id}`, { method: 'DELETE' })
  return parseOrThrow<void>(response)
}

export async function listNotesLinkedToArgument(argumentId: string): Promise<NoteSummary[]> {
  const response = await authFetch(`${NOTES_URL}/linked-to/${argumentId}`)
  return parseOrThrow<NoteSummary[]>(response)
}
