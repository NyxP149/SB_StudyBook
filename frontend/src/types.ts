export type NoteStatus = 'PENDING' | 'DONE' | 'FAILED'

export interface NoteSummary {
  id: string
  originalFilename: string
  provider: string
  modelSize: string
  status: NoteStatus
  createdAt: string
}

export interface Note extends NoteSummary {
  transcript: string | null
  noteMarkdown: string | null
  errorMessage: string | null
}

export interface SubmitOptions {
  provider?: string
  modelSize?: string
}
