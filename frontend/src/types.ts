export type NoteStatus = 'PENDING' | 'DONE' | 'FAILED'
export type NoteImportance = 'NORMALE' | 'IMPORTANTE' | 'URGENTE'

export interface NoteSummary {
  id: string
  originalFilename: string
  provider: string
  modelSize: string | null
  templateId: string | null
  folderId: string | null
  importance: NoteImportance
  status: NoteStatus
  createdAt: string
}

export interface Note extends NoteSummary {
  templateId: string | null
  transcript: string | null
  noteMarkdown: string | null
  errorMessage: string | null
}

export interface Folder {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface FolderInput {
  name: string
  color: string
}

export interface SubmitOptions {
  provider?: string
  modelSize?: string
  templateId?: string
}

export interface SubmitTextOptions {
  provider?: string
  templateId?: string
}

export interface TemplateSection {
  title: string
  instructions: string
}

export interface Template {
  id: string
  name: string
  description: string | null
  sections: TemplateSection[]
  createdAt: string
}

export interface TemplateInput {
  name: string
  description: string
  sections: TemplateSection[]
}
