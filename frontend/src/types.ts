export type NoteStatus = 'PENDING' | 'DONE' | 'FAILED'
export type NoteImportance = 'NORMALE' | 'IMPORTANTE' | 'URGENTE'

export interface NoteSummary {
  id: string
  originalFilename: string
  provider: string
  modelSize: string | null
  templateId: string | null
  folderIds: string[]
  importance: NoteImportance
  status: NoteStatus
  background: string | null
  createdAt: string
}

export interface Note extends NoteSummary {
  templateId: string | null
  transcript: string | null
  noteMarkdown: string | null
  errorMessage: string | null
  linkedArgumentId: string | null
  linkedArgumentTitle: string | null
  suggestedArgumentId: string | null
  suggestedArgumentTitle: string | null
}

export interface Folder {
  id: string
  name: string
  color: string
  parentId: string | null
  depth: number
  createdAt: string
}

export interface FolderInput {
  name: string
  color: string
  parentId?: string | null
}

export interface SubmitOptions {
  provider?: string
  modelSize?: string
  templateId?: string
}

export interface SubmitTextOptions {
  provider?: string
  templateId?: string
  generate?: boolean
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

export type StudyProgramFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface StudyProgram {
  id: string
  name: string
  frequency: StudyProgramFrequency
  createdAt: string
}

export interface StudyProgramInput {
  name: string
  frequency: StudyProgramFrequency
}

export interface StudyArgument {
  id: string
  programId: string
  title: string
  scheduledDate: string
  content: string | null
  completed: boolean
  createdAt: string
}

export interface StudyArgumentInput {
  title: string
  scheduledDate: string
  content: string
  completed: boolean
}

export interface StudyArgumentCompletionResult {
  argument: StudyArgument
  encouragementMessage: string
  completedCount: number
  totalCount: number
}

export interface StudyImage {
  id: string
  argumentId: string
  filename: string
  contentType: string
  createdAt: string
}

export interface StudyArgumentNote {
  id: string
  argumentId: string
  content: string
  background: string | null
  createdAt: string
  updatedAt: string
}

export interface StudyUpcoming {
  argumentId: string
  programId: string
  programName: string
  title: string
  scheduledDate: string
  overdue: boolean
}
