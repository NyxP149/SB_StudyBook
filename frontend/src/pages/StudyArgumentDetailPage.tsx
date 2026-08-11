import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  deleteStudyArgument,
  deleteStudyImage,
  getStudyArgument,
  listStudyImages,
  updateStudyArgument,
  uploadStudyImage,
} from '../api/client'
import { AuthedImage } from '../components/AuthedImage'
import { formatDateTime } from '../utils/formatDate'
import type { StudyArgument, StudyImage } from '../types'
import './StudyPage.css'

export function StudyArgumentDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [argument, setArgument] = useState<StudyArgument | null>(null)
  const [images, setImages] = useState<StudyImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const refresh = () => {
    if (!id) return
    getStudyArgument(id)
      .then(setArgument)
      .catch((e) => setError(e instanceof Error ? e.message : t('common.unknownError')))
    listStudyImages(id)
      .then(setImages)
      .catch(() => setImages([]))
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

  function startEditing() {
    setDraft(argument!.content ?? '')
    setIsEditing(true)
  }

  async function saveContent() {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateStudyArgument(argument!.id, {
        title: argument!.title,
        scheduledDate: argument!.scheduledDate,
        content: draft,
        completed: argument!.completed,
      })
      setArgument(updated)
      setIsEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleCompleted() {
    try {
      const updated = await updateStudyArgument(argument!.id, {
        title: argument!.title,
        scheduledDate: argument!.scheduledDate,
        content: argument!.content ?? '',
        completed: !argument!.completed,
      })
      setArgument(updated)
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

  return (
    <div className="study-page">
      <Link to={`/study/programs/${argument.programId}`} className="back-link">
        {t('study.backToProgram')}
      </Link>

      <header className="note-detail-header">
        <div>
          <h1>{argument.title}</h1>
          <p className="note-detail-theme">{formatDateTime(argument.scheduledDate, i18n.language)}</p>
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

      <div className="note-detail-actions">
        {isEditing ? (
          <>
            <button type="button" className="note-action-button primary" onClick={saveContent} disabled={saving}>
              {saving ? t('noteDetail.saving') : t('noteDetail.save')}
            </button>
            <button type="button" className="note-action-button" onClick={() => setIsEditing(false)} disabled={saving}>
              {t('common.cancel')}
            </button>
          </>
        ) : (
          <button type="button" className="note-action-button" onClick={startEditing}>
            {t('noteDetail.edit')}
          </button>
        )}
      </div>

      {isEditing ? (
        <textarea
          className="note-edit-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={saving}
          rows={14}
          placeholder={t('study.contentPlaceholder')}
        />
      ) : argument.content ? (
        <p className="study-argument-content">{argument.content}</p>
      ) : (
        <p className="notes-loading">{t('study.noContent')}</p>
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
              <div key={image.id} className="study-image-tile">
                <AuthedImage imageId={image.id} alt={image.filename} className="study-image-thumb" />
                <button
                  type="button"
                  className="study-image-remove"
                  onClick={() => handleImageDelete(image.id)}
                  aria-label={t('common.delete')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
