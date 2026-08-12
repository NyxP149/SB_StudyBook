import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  createStudyArgument,
  deleteStudyArgument,
  listStudyArguments,
  listStudyPrograms,
  updateStudyArgument,
} from '../api/client'
import { formatDateOnly } from '../utils/formatDate'
import { downloadProgramIcs } from '../utils/ics'
import type { StudyArgument, StudyArgumentInput, StudyProgram } from '../types'
import './StudyPage.css'

function emptyForm(): StudyArgumentInput {
  return { title: '', scheduledDate: new Date().toISOString().slice(0, 10), content: '', completed: false }
}

export function StudyProgramDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [program, setProgram] = useState<StudyProgram | null>(null)
  const [args, setArgs] = useState<StudyArgument[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<StudyArgumentInput>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = () => {
    if (!id) return
    listStudyPrograms()
      .then((programs) => setProgram(programs.find((p) => p.id === id) ?? null))
      .catch(() => setProgram(null))
    listStudyArguments(id)
      .then(setArgs)
      .catch((e) => setError(e instanceof Error ? e.message : t('common.unknownError')))
  }

  useEffect(refresh, [id])

  const startCreate = () => {
    setEditingId('new')
    setForm(emptyForm())
    setError(null)
  }

  const startEdit = (argument: StudyArgument) => {
    setEditingId(argument.id)
    setForm({
      title: argument.title,
      scheduledDate: argument.scheduledDate,
      content: argument.content ?? '',
      completed: argument.completed,
    })
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setError(null)
  }

  const save = async () => {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      if (editingId && editingId !== 'new') {
        await updateStudyArgument(editingId, form)
      } else {
        await createStudyArgument(id, form)
      }
      setEditingId(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (argumentId: string) => {
    if (!window.confirm(t('study.confirmDeleteArgument'))) return
    try {
      await deleteStudyArgument(argumentId)
      if (editingId === argumentId) setEditingId(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.deleteFailed'))
    }
  }

  const isEditing = editingId !== null

  return (
    <div className="study-page">
      <Link to="/study" className="back-link">
        {t('study.backLink')}
      </Link>

      <header className="templates-header">
        <div>
          <h1>{program?.name ?? '…'}</h1>
          {program && (
            <span className={`study-frequency-tag freq-${program.frequency.toLowerCase()}`}>
              {t(`study.frequency.${program.frequency}`)}
            </span>
          )}
        </div>
        {!isEditing && (
          <div className="study-detail-header-actions">
            <button
              type="button"
              className="new-template-button"
              onClick={() => program && args && downloadProgramIcs(program, args)}
              disabled={!program || !args || args.length === 0}
            >
              {t('study.exportIcs')}
            </button>
            <Link to={`/study/programs/${id}/grid`} className="save-button">
              {t('study.addBatch')}
            </Link>
            <button type="button" className="new-template-button" onClick={startCreate}>
              {t('study.newArgument')}
            </button>
          </div>
        )}
      </header>

      {error && <p className="upload-error">{error}</p>}

      {!isEditing && args && args.length > 0 && (
        <div>
          <p className="study-progress-label">
            {t('study.progressLabel', {
              completed: args.filter((a) => a.completed).length,
              total: args.length,
              percent: Math.round((args.filter((a) => a.completed).length / args.length) * 100),
            })}
          </p>
          <div className="study-progress-bar">
            <div
              className="study-progress-bar-fill"
              style={{ width: `${Math.round((args.filter((a) => a.completed).length / args.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {!isEditing && (
        <>
          {!args && <p className="notes-loading">{t('common.loading')}</p>}
          {args && args.length === 0 && (
            <div className="notes-empty">
              <span>📖</span>
              <p>{t('study.emptyArguments')}</p>
            </div>
          )}
          {args && args.length > 0 && (
            <ul className="study-argument-list">
              {args.map((argument) => (
                <li key={argument.id} className={`study-argument-row ${argument.completed ? 'completed' : ''}`}>
                  <Link to={`/study/arguments/${argument.id}`} className="study-argument-link">
                    <span className="study-argument-date">{formatDateOnly(argument.scheduledDate, i18n.language)}</span>
                    <span className="study-argument-title">{argument.title}</span>
                    {argument.completed && <span className="study-argument-done">✓</span>}
                  </Link>
                  <button type="button" className="study-program-edit" onClick={() => startEdit(argument)}>
                    {t('noteDetail.edit')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {isEditing && (
        <div className="template-form">
          <label className="template-field">
            {t('study.argumentTitle')}
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={t('study.argumentTitlePlaceholder')}
            />
          </label>

          <label className="template-field">
            {t('study.argumentDate')}
            <input
              type="date"
              value={form.scheduledDate}
              onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
            />
          </label>

          {editingId !== 'new' && (
            <label className="study-checkbox-field">
              <input
                type="checkbox"
                checked={form.completed}
                onChange={(e) => setForm((f) => ({ ...f, completed: e.target.checked }))}
              />
              {t('study.markCompleted')}
            </label>
          )}

          <div className="template-form-actions">
            {editingId !== 'new' && (
              <button type="button" className="delete-template-button" onClick={() => editingId && remove(editingId)}>
                {t('common.delete')}
              </button>
            )}
            <div className="template-form-actions-right">
              <button type="button" className="cancel-button" onClick={cancelEdit}>
                {t('common.cancel')}
              </button>
              <button type="button" className="save-button" onClick={save} disabled={saving || !form.title.trim()}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
