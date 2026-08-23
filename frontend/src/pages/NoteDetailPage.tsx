import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNote } from '../hooks/useNote'
import {
  confirmNoteLink,
  deleteNote,
  dismissNoteLink,
  listFolders,
  organizeNote,
  renameNote,
  updateNote,
  updateNoteBackground,
} from '../api/client'
import { FormattingToolbar } from '../components/FormattingToolbar'
import { InsertImageButton } from '../components/InsertImageButton'
import { NoteBackgroundPicker } from '../components/NoteBackgroundPicker'
import { NoteFolderPicker } from '../components/NoteFolderPicker'
import { NoteMarkdown } from '../components/NoteMarkdown'
import { SaveAsTemplateButton } from '../components/SaveAsTemplateButton'
import { StatusBadge } from '../components/StatusBadge'
import { backgroundClassName } from '../noteBackgrounds'
import { downloadNoteDocx } from '../utils/docx'
import { downloadNotePdf } from '../utils/pdf'
import { extractTheme } from '../utils/noteExcerpt'
import { formatDateTime } from '../utils/formatDate'
import { normalizeLineEndings } from '../utils/text'
import type { Folder, NoteImportance } from '../types'
import './NoteDetailPage.css'

const IMPORTANCE_OPTIONS: Array<{ value: NoteImportance; labelKey: string; icon: string }> = [
  { value: 'NORMALE', labelKey: 'importance.normal', icon: '⚪' },
  { value: 'IMPORTANTE', labelKey: 'importance.important', icon: '⭐' },
  { value: 'URGENTE', labelKey: 'importance.urgent', icon: '🔴' },
]

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.[^./]+$/, '') + '.md'
  a.click()
  URL.revokeObjectURL(url)
}

export function NoteDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { note, error, setNote } = useNote(id)
  const [showTranscript, setShowTranscript] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [organizeError, setOrganizeError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [linkActionPending, setLinkActionPending] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [backgroundError, setBackgroundError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [exportingDocx, setExportingDocx] = useState(false)
  const [docxError, setDocxError] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  type OrganizeTarget = { folderIds: string[]; importance: NoteImportance }
  const latestOrganizeTargetRef = useRef<OrganizeTarget | null>(null)
  const queuedOrganizeRef = useRef<OrganizeTarget | null>(null)
  const organizeInFlightRef = useRef(false)

  useEffect(() => {
    listFolders()
      .then(setFolders)
      .catch(() => setFolders([]))
  }, [])

  if (error) {
    return (
      <div className="note-detail-page">
        <p className="upload-error">{error}</p>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="note-detail-page">
        <p className="notes-loading">{t('common.loading')}</p>
      </div>
    )
  }

  const theme = extractTheme(note.noteMarkdown)

  function startEditing() {
    setDraft(normalizeLineEndings(note!.noteMarkdown ?? ''))
    setSaveError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setSaveError(null)
  }

  async function saveEditing() {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateNote(note!.id, draft)
      setNote(updated)
      setIsEditing(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleOrganize(folderIds: string[], importance: NoteImportance) {
    const target = { folderIds, importance }
    latestOrganizeTargetRef.current = target
    queuedOrganizeRef.current = target
    setOrganizeError(null)

    if (organizeInFlightRef.current) return
    organizeInFlightRef.current = true
    try {
      // Sends one request at a time, in order: a still-in-flight PATCH could
      // otherwise land after a newer one and silently revert it server-side.
      while (queuedOrganizeRef.current) {
        const toSend = queuedOrganizeRef.current
        queuedOrganizeRef.current = null
        try {
          const updated = await organizeNote(note!.id, toSend.folderIds, toSend.importance)
          setNote(updated)
        } catch (e) {
          setOrganizeError(e instanceof Error ? e.message : t('noteDetail.organizeFailed'))
          break
        }
      }
    } finally {
      organizeInFlightRef.current = false
    }
  }

  async function handleConfirmLink() {
    setLinkActionPending(true)
    setLinkError(null)
    try {
      setNote(await confirmNoteLink(note!.id))
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setLinkActionPending(false)
    }
  }

  async function handleDismissLink() {
    setLinkActionPending(true)
    setLinkError(null)
    try {
      setNote(await dismissNoteLink(note!.id))
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setLinkActionPending(false)
    }
  }

  async function handleBackgroundChange(next: string | null) {
    setBackgroundError(null)
    try {
      setNote(await updateNoteBackground(note!.id, next))
    } catch (e) {
      setBackgroundError(e instanceof Error ? e.message : t('common.saveFailed'))
    }
  }

  function startRenaming() {
    setNameDraft(note!.originalFilename)
    setRenameError(null)
    setIsRenaming(true)
  }

  function cancelRenaming() {
    setIsRenaming(false)
    setRenameError(null)
  }

  async function saveRename() {
    const name = nameDraft.trim()
    if (!name) {
      return
    }
    setRenaming(true)
    setRenameError(null)
    try {
      setNote(await renameNote(note!.id, name))
      setIsRenaming(false)
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setRenaming(false)
    }
  }

  async function handleExportDocx() {
    setDocxError(null)
    setExportingDocx(true)
    try {
      await downloadNoteDocx(note!)
    } catch (e) {
      setDocxError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setExportingDocx(false)
    }
  }

  async function handleExportPdf() {
    setPdfError(null)
    setExportingPdf(true)
    try {
      await downloadNotePdf(note!)
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setExportingPdf(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('noteDetail.confirmDelete'))) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteNote(note!.id)
      navigate('/notes')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t('common.deleteFailed'))
      setDeleting(false)
    }
  }

  return (
    <div className="note-detail-page">
      <Link to="/notes" className="back-link no-print">
        {t('noteDetail.backLink')}
      </Link>

      <header className="note-detail-header">
        <div>
          {isRenaming ? (
            <div className="note-detail-rename no-print">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename()
                  if (e.key === 'Escape') cancelRenaming()
                }}
                disabled={renaming}
                autoFocus
              />
              <button
                type="button"
                className="note-action-button primary"
                onClick={saveRename}
                disabled={renaming || !nameDraft.trim()}
              >
                {renaming ? t('noteDetail.saving') : t('common.save')}
              </button>
              <button type="button" className="note-action-button" onClick={cancelRenaming} disabled={renaming}>
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <h1 className="note-detail-title">
              {note.originalFilename}
              <button
                type="button"
                className="note-detail-rename-trigger no-print"
                onClick={startRenaming}
                aria-label={t('noteDetail.renameAria')}
                title={t('noteDetail.renameAria')}
              >
                ✎
              </button>
            </h1>
          )}
          {renameError && <p className="upload-error no-print">{renameError}</p>}
          {theme && <p className="note-detail-theme">{theme}</p>}
        </div>
        <div className="note-detail-header-actions no-print">
          <StatusBadge status={note.status} />
          <button type="button" className="note-action-button danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? t('notes.deleting') : t('noteDetail.delete')}
          </button>
        </div>
      </header>

      {deleteError && <p className="upload-error no-print">{deleteError}</p>}

      <div className="note-detail-meta">
        <span>{note.provider}</span>
        {note.modelSize && (
          <>
            <span className="dot">·</span>
            <span>{note.modelSize}</span>
          </>
        )}
        <span className="dot">·</span>
        <span>{formatDateTime(note.createdAt, i18n.language)}</span>
      </div>

      {linkError && <p className="upload-error no-print">{linkError}</p>}

      {note.linkedArgumentTitle && (
        <Link to={`/study/arguments/${note.linkedArgumentId}`} className="note-link-badge no-print">
          {t('noteDetail.linkedTo', { title: note.linkedArgumentTitle })}
        </Link>
      )}

      {note.suggestedArgumentTitle && (
        <div className="note-link-suggestion no-print">
          <p>{t('noteDetail.suggestedLink', { title: note.suggestedArgumentTitle })}</p>
          <div className="note-link-suggestion-actions">
            <button
              type="button"
              className="note-action-button primary"
              onClick={handleConfirmLink}
              disabled={linkActionPending}
            >
              {t('noteDetail.confirmLink')}
            </button>
            <button
              type="button"
              className="note-action-button"
              onClick={handleDismissLink}
              disabled={linkActionPending}
            >
              {t('noteDetail.dismissLink')}
            </button>
          </div>
        </div>
      )}

      <div className="note-organize-bar no-print">
        <div className="importance-group">
          {IMPORTANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`importance-button imp-${opt.value.toLowerCase()} ${note.importance === opt.value ? 'active' : ''}`}
              onClick={() => handleOrganize(latestOrganizeTargetRef.current?.folderIds ?? note.folderIds, opt.value)}
            >
              {opt.icon} {t(opt.labelKey)}
            </button>
          ))}
        </div>
        <NoteFolderPicker
          folders={folders}
          selectedIds={latestOrganizeTargetRef.current?.folderIds ?? note.folderIds}
          onChange={(folderIds) => handleOrganize(folderIds, latestOrganizeTargetRef.current?.importance ?? note.importance)}
        />
      </div>

      {organizeError && <p className="upload-error no-print">{organizeError}</p>}

      {note.status === 'PENDING' && (
        <div className="note-pending">
          <span className="brew-icon">☕</span>
          <p>{t('noteDetail.processing')}</p>
          <p className="note-pending-sub">{t('noteDetail.processingHint')}</p>
        </div>
      )}

      {note.status === 'FAILED' && (
        <div className="note-failed">
          <strong>{t('noteDetail.failedTitle')}</strong>
          <pre>{note.errorMessage}</pre>
          {note.modelSize && (
            <p className="note-failed-hint">
              {t('noteDetail.failedAudioHint')} <Link to="/upload">{t('noteDetail.failedAudioHintLink')}</Link>
            </p>
          )}
        </div>
      )}

      {note.status === 'DONE' && note.noteMarkdown && (
        <>
          <div className="note-detail-actions no-print">
            {isEditing ? (
              <>
                <button type="button" className="note-action-button primary" onClick={saveEditing} disabled={saving}>
                  {saving ? t('noteDetail.saving') : t('noteDetail.save')}
                </button>
                <button type="button" className="note-action-button" onClick={cancelEditing} disabled={saving}>
                  {t('common.cancel')}
                </button>
                <InsertImageButton
                  textareaRef={editTextareaRef}
                  value={draft}
                  onChange={setDraft}
                  disabled={saving}
                  onError={setSaveError}
                />
              </>
            ) : (
              <>
                <button type="button" className="note-action-button" onClick={startEditing}>
                  {t('noteDetail.edit')}
                </button>
                <button
                  type="button"
                  className="note-action-button"
                  onClick={() => downloadMarkdown(note.originalFilename, note.noteMarkdown!)}
                >
                  {t('noteDetail.download')}
                </button>
                <button type="button" className="note-action-button" onClick={() => window.print()}>
                  {t('noteDetail.print')}
                </button>
                <button type="button" className="note-action-button" onClick={handleExportDocx} disabled={exportingDocx}>
                  {exportingDocx ? t('noteDetail.saving') : t('noteDetail.downloadDocx')}
                </button>
                <button type="button" className="note-action-button" onClick={handleExportPdf} disabled={exportingPdf}>
                  {exportingPdf ? t('noteDetail.saving') : t('noteDetail.downloadPdf')}
                </button>
                <NoteBackgroundPicker value={note.background} onSelect={handleBackgroundChange} />
                <SaveAsTemplateButton noteMarkdown={note.noteMarkdown} />
              </>
            )}
          </div>

          {saveError && <p className="upload-error no-print">{saveError}</p>}
          {backgroundError && <p className="upload-error no-print">{backgroundError}</p>}
          {docxError && <p className="upload-error no-print">{docxError}</p>}
          {pdfError && <p className="upload-error no-print">{pdfError}</p>}

          {isEditing ? (
            <>
              <FormattingToolbar textareaRef={editTextareaRef} value={draft} onChange={setDraft} disabled={saving} />
              <textarea
                ref={editTextareaRef}
                className="note-edit-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={saving}
                rows={20}
              />
            </>
          ) : (
            <NoteMarkdown content={note.noteMarkdown} backgroundClass={backgroundClassName(note.background)} />
          )}

          {note.transcript && (
            <div className="transcript-panel no-print">
              <button type="button" onClick={() => setShowTranscript((v) => !v)} className="transcript-toggle">
                {showTranscript ? '▾' : '▸'} {t('noteDetail.rawTranscript')}
              </button>
              {showTranscript && <p className="transcript-text">{note.transcript}</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
