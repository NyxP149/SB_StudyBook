import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  completeStudyArgument,
  createStudyArgumentNote,
  deleteStudyArgument,
  deleteStudyArgumentNote,
  deleteStudyImage,
  fetchStudyImageObjectUrl,
  getStudyArgument,
  listNotesLinkedToArgument,
  listStudyArgumentNotes,
  listStudyImages,
  updateStudyArgument,
  updateStudyArgumentNote,
  updateStudyArgumentNoteBackground,
  uploadStudyImage,
} from '../api/client'
import { AuthedImage } from '../components/AuthedImage'
import { FormattingToolbar } from '../components/FormattingToolbar'
import { ImageLightbox } from '../components/ImageLightbox'
import { InsertImageButton } from '../components/InsertImageButton'
import { NoteBackgroundPicker } from '../components/NoteBackgroundPicker'
import { NoteMarkdown } from '../components/NoteMarkdown'
import { StatusBadge } from '../components/StatusBadge'
import { backgroundClassName } from '../noteBackgrounds'
import { formatDateOnly, formatDateTime } from '../utils/formatDate'
import { normalizeLineEndings } from '../utils/text'
import type { NoteSummary, StudyArgument, StudyArgumentNote, StudyImage } from '../types'
import './StudyPage.css'

function ArgumentNoteItem({
  note,
  onSaved,
  onDeleted,
  onError,
}: {
  note: StudyArgumentNote
  onSaved: (note: StudyArgumentNote) => void
  onDeleted: (id: string) => void
  onError: (message: string) => void
}) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(normalizeLineEndings(note.content))
  const [saving, setSaving] = useState(false)
  const [backgroundError, setBackgroundError] = useState<string | null>(null)

  async function changeBackground(next: string | null) {
    setBackgroundError(null)
    try {
      onSaved(await updateStudyArgumentNoteBackground(note.id, next))
    } catch (e) {
      setBackgroundError(e instanceof Error ? e.message : t('common.saveFailed'))
    }
  }

  function startEditing() {
    setDraft(normalizeLineEndings(note.content))
    setIsEditing(true)
  }

  async function save() {
    setSaving(true)
    try {
      onSaved(await updateStudyArgumentNote(note.id, draft))
      setIsEditing(false)
    } catch (e) {
      onError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm(t('study.confirmDeleteNote'))) return
    try {
      await deleteStudyArgumentNote(note.id)
      onDeleted(note.id)
    } catch (e) {
      onError(e instanceof Error ? e.message : t('common.deleteFailed'))
    }
  }

  return (
    <div className="study-note-item">
      <div className="note-detail-actions">
        {isEditing ? (
          <>
            <button type="button" className="note-action-button primary" onClick={save} disabled={saving}>
              {saving ? t('noteDetail.saving') : t('noteDetail.save')}
            </button>
            <button type="button" className="note-action-button" onClick={() => setIsEditing(false)} disabled={saving}>
              {t('common.cancel')}
            </button>
            <InsertImageButton textareaRef={textareaRef} value={draft} onChange={setDraft} disabled={saving} onError={onError} />
          </>
        ) : (
          <>
            <button type="button" className="note-action-button" onClick={startEditing}>
              {t('noteDetail.edit')}
            </button>
            <button type="button" className="note-action-button danger" onClick={remove}>
              {t('common.delete')}
            </button>
            <NoteBackgroundPicker value={note.background} onSelect={changeBackground} />
          </>
        )}
      </div>

      {backgroundError && <p className="upload-error no-print">{backgroundError}</p>}

      {isEditing ? (
        <>
          <FormattingToolbar textareaRef={textareaRef} value={draft} onChange={setDraft} disabled={saving} />
          <textarea
            ref={textareaRef}
            className="note-edit-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            rows={8}
            placeholder={t('study.notePlaceholder')}
          />
        </>
      ) : (
        <NoteMarkdown content={note.content} backgroundClass={backgroundClassName(note.background)} />
      )}
    </div>
  )
}

export function StudyArgumentDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newNoteTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [argument, setArgument] = useState<StudyArgument | null>(null)
  const [images, setImages] = useState<StudyImage[]>([])
  const [notes, setNotes] = useState<StudyArgumentNote[]>([])
  const [linkedNotes, setLinkedNotes] = useState<NoteSummary[]>([])
  const [activeTab, setActiveTab] = useState<'mine' | 'linked'>('mine')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [creatingNote, setCreatingNote] = useState(false)
  const [newNoteDraft, setNewNoteDraft] = useState('')
  const [savingNewNote, setSavingNewNote] = useState(false)
  const [encouragement, setEncouragement] = useState<string | null>(null)
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null)

  const refresh = () => {
    if (!id) return
    getStudyArgument(id)
      .then(setArgument)
      .catch((e) => setError(e instanceof Error ? e.message : t('common.unknownError')))
    listStudyImages(id)
      .then(setImages)
      .catch(() => setImages([]))
    listStudyArgumentNotes(id)
      .then(setNotes)
      .catch(() => setNotes([]))
    listNotesLinkedToArgument(id)
      .then(setLinkedNotes)
      .catch(() => setLinkedNotes([]))
  }

  useEffect(refresh, [id])

  if (error) {
    return (
      <div className="study-page">
        <p className="upload-error">{error}</p>
      </div>
    )
  }

  if (!argument) {
    return (
      <div className="study-page">
        <p className="notes-loading">{t('common.loading')}</p>
      </div>
    )
  }

  async function toggleCompleted() {
    try {
      if (!argument!.completed) {
        const result = await completeStudyArgument(argument!.id)
        setArgument(result.argument)
        setEncouragement(result.encouragementMessage)
      } else {
        const updated = await updateStudyArgument(argument!.id, {
          title: argument!.title,
          scheduledDate: argument!.scheduledDate,
          content: argument!.content ?? '',
          completed: false,
        })
        setArgument(updated)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('study.confirmDeleteArgument'))) return
    setDeleting(true)
    try {
      await deleteStudyArgument(argument!.id)
      navigate(`/study/programs/${argument!.programId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.deleteFailed'))
      setDeleting(false)
    }
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      await uploadStudyImage(argument!.id, file)
      const refreshed = await listStudyImages(argument!.id)
      setImages(refreshed)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('study.errImageUpload'))
    } finally {
      setUploading(false)
    }
  }

  async function handleImageDelete(imageId: string) {
    try {
      await deleteStudyImage(imageId)
      setImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.deleteFailed'))
    }
  }

  function startCreatingNote() {
    setNewNoteDraft('')
    setCreatingNote(true)
  }

  async function saveNewNote() {
    if (!newNoteDraft.trim()) return
    setSavingNewNote(true)
    try {
      const created = await createStudyArgumentNote(argument!.id, newNoteDraft)
      setNotes((prev) => [...prev, created])
      setCreatingNote(false)
      setNewNoteDraft('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setSavingNewNote(false)
    }
  }

  return (
    <div className="study-page">
      <Link to={`/study/programs/${argument.programId}`} className="back-link">
        {t('study.backToProgram')}
      </Link>

      <header className="note-detail-header">
        <div>
          <h1>{argument.title}</h1>
          <p className="note-detail-theme">{formatDateOnly(argument.scheduledDate, i18n.language)}</p>
        </div>
        <div className="note-detail-header-actions">
          <button
            type="button"
            className={`study-status-toggle ${argument.completed ? 'done' : ''}`}
            onClick={toggleCompleted}
          >
            {argument.completed ? t('study.completed') : t('study.markCompleted')}
          </button>
          <button type="button" className="note-action-button danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? t('notes.deleting') : t('noteDetail.delete')}
          </button>
        </div>
      </header>

      {error && <p className="upload-error">{error}</p>}

      {encouragement && (
        <div className="study-encouragement-banner">
          <span>🌱 {encouragement}</span>
          <button type="button" onClick={() => setEncouragement(null)} aria-label={t('study.dismissEncouragement')}>
            ✕
          </button>
        </div>
      )}

      <div className="study-images-section">
        <div className="study-images-header">
          <h3>{t('study.images')}</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImageUpload(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="note-action-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? t('upload.sending') : t('study.addImage')}
          </button>
        </div>

        {images.length === 0 ? (
          <p className="notes-loading">{t('study.noImages')}</p>
        ) : (
          <div className="study-images-grid">
            {images.map((image) => (
              <div
                key={image.id}
                className="study-image-tile"
                onClick={() => setLightboxImageId(image.id)}
              >
                <AuthedImage
                  imageId={image.id}
                  alt={image.filename}
                  className="study-image-thumb"
                  fetcher={fetchStudyImageObjectUrl}
                />
                <button
                  type="button"
                  className="study-image-remove"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleImageDelete(image.id)
                  }}
                  aria-label={t('common.delete')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxImageId && (
        <ImageLightbox onClose={() => setLightboxImageId(null)}>
          <AuthedImage
            imageId={lightboxImageId}
            alt=""
            className="image-lightbox-full"
            fetcher={fetchStudyImageObjectUrl}
          />
        </ImageLightbox>
      )}

      <div className="mode-tabs">
        <button
          type="button"
          className={`mode-tab ${activeTab === 'mine' ? 'active' : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          {t('study.myNotes')}
        </button>
        <button
          type="button"
          className={`mode-tab ${activeTab === 'linked' ? 'active' : ''}`}
          onClick={() => setActiveTab('linked')}
        >
          {t('study.linkedNotes')} {linkedNotes.length > 0 && `(${linkedNotes.length})`}
        </button>
      </div>

      {activeTab === 'mine' && (
        <div className="study-notes-section">
          {!creatingNote && (
            <button type="button" className="note-action-button" onClick={startCreatingNote}>
              {t('study.newNote')}
            </button>
          )}

          {creatingNote && (
            <div className="study-note-item">
              <FormattingToolbar textareaRef={newNoteTextareaRef} value={newNoteDraft} onChange={setNewNoteDraft} disabled={savingNewNote} />
              <textarea
                ref={newNoteTextareaRef}
                className="note-edit-textarea"
                value={newNoteDraft}
                onChange={(e) => setNewNoteDraft(e.target.value)}
                disabled={savingNewNote}
                rows={8}
                placeholder={t('study.notePlaceholder')}
              />
              <div className="note-detail-actions">
                <button
                  type="button"
                  className="note-action-button primary"
                  onClick={saveNewNote}
                  disabled={savingNewNote || !newNoteDraft.trim()}
                >
                  {savingNewNote ? t('noteDetail.saving') : t('noteDetail.save')}
                </button>
                <button
                  type="button"
                  className="note-action-button"
                  onClick={() => setCreatingNote(false)}
                  disabled={savingNewNote}
                >
                  {t('common.cancel')}
                </button>
                <InsertImageButton
                  textareaRef={newNoteTextareaRef}
                  value={newNoteDraft}
                  onChange={setNewNoteDraft}
                  disabled={savingNewNote}
                  onError={setError}
                />
              </div>
            </div>
          )}

          {notes.length === 0 && !creatingNote ? (
            <p className="notes-loading">{t('study.noNotes')}</p>
          ) : (
            <div className="study-notes-list">
              {notes.map((note) => (
                <ArgumentNoteItem
                  key={note.id}
                  note={note}
                  onSaved={(updated) => setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))}
                  onDeleted={(noteId) => setNotes((prev) => prev.filter((n) => n.id !== noteId))}
                  onError={setError}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'linked' && (
        <div className="study-notes-section">
          {linkedNotes.length === 0 ? (
            <p className="notes-loading">{t('study.noLinkedNotes')}</p>
          ) : (
            <ul className="study-linked-notes-list">
              {linkedNotes.map((note) => (
                <li key={note.id}>
                  <Link to={`/notes/${note.id}`} className="study-linked-note-row">
                    <span className="study-linked-note-title">{note.originalFilename}</span>
                    <StatusBadge status={note.status} />
                    <span className="study-linked-note-date">{formatDateTime(note.createdAt, i18n.language)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
