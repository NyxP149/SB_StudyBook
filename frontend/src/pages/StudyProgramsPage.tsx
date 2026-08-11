import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createStudyProgram, deleteStudyProgram, listStudyPrograms, listStudyUpcoming, updateStudyProgram } from '../api/client'
import { formatDateOnly } from '../utils/formatDate'
import type { StudyProgram, StudyProgramFrequency, StudyProgramInput, StudyUpcoming } from '../types'
import './StudyPage.css'

const FREQUENCIES: StudyProgramFrequency[] = ['WEEKLY', 'MONTHLY', 'YEARLY']

function emptyForm(): StudyProgramInput {
  return { name: '', frequency: 'WEEKLY' }
}

export function StudyProgramsPage() {
  const { t, i18n } = useTranslation()
  const [programs, setPrograms] = useState<StudyProgram[] | null>(null)
  const [upcoming, setUpcoming] = useState<StudyUpcoming[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<StudyProgramInput>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = () => {
    listStudyPrograms()
      .then(setPrograms)
      .catch((e) => setError(e instanceof Error ? e.message : t('common.unknownError')))
    listStudyUpcoming()
      .then(setUpcoming)
      .catch(() => setUpcoming([]))
  }

  useEffect(refresh, [])

  const startCreate = () => {
    setEditingId('new')
    setForm(emptyForm())
    setError(null)
  }

  const startEdit = (program: StudyProgram) => {
    setEditingId(program.id)
    setForm({ name: program.name, frequency: program.frequency })
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setError(null)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editingId && editingId !== 'new') {
        await updateStudyProgram(editingId, form)
      } else {
        await createStudyProgram(form)
      }
      setEditingId(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm(t('study.confirmDeleteProgram'))) return
    try {
      await deleteStudyProgram(id)
      if (editingId === id) setEditingId(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.deleteFailed'))
    }
  }

  const isEditing = editingId !== null

  return (
    <div className="study-page">
      <header className="templates-header">
        <div>
          <h1>{t('study.title')}</h1>
          <p>{t('study.subtitle')}</p>
        </div>
        {!isEditing && (
          <button type="button" className="new-template-button" onClick={startCreate}>
            {t('study.newProgram')}
          </button>
        )}
      </header>

      {error && <p className="upload-error">{error}</p>}

      {!isEditing && upcoming.length > 0 && (
        <div className="study-upcoming-panel">
          <strong>{t('study.upcomingTitle')}</strong>
          <ul className="study-upcoming-list">
            {upcoming.map((item) => (
              <li key={item.argumentId} className={item.overdue ? 'overdue' : ''}>
                <Link to={`/study/arguments/${item.argumentId}`}>
                  <span className="study-upcoming-date">{formatDateOnly(item.scheduledDate, i18n.language)}</span>
                  <span className="study-upcoming-title">{item.title}</span>
                  <span className="study-upcoming-program">{item.programName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isEditing && (
        <>
          {!programs && <p className="notes-loading">{t('common.loading')}</p>}
          {programs && programs.length === 0 && (
            <div className="notes-empty">
              <span>📚</span>
              <p>{t('study.empty')}</p>
            </div>
          )}
          {programs && programs.length > 0 && (
            <div className="study-programs-grid">
              {programs.map((program) => (
                <div key={program.id} className="study-program-card">
                  <Link to={`/study/programs/${program.id}`} className="study-program-card-link">
                    <h3>{program.name}</h3>
                    <span className={`study-frequency-tag freq-${program.frequency.toLowerCase()}`}>
                      {t(`study.frequency.${program.frequency}`)}
                    </span>
                  </Link>
                  <button type="button" className="study-program-edit" onClick={() => startEdit(program)}>
                    {t('noteDetail.edit')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isEditing && (
        <div className="template-form">
          <label className="template-field">
            {t('common.name')}
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('study.namePlaceholder')}
            />
          </label>

          <label className="template-field">
            {t('study.frequencyLabel')}
            <select
              value={form.frequency}
              onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as StudyProgramFrequency }))}
            >
              {FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>
                  {t(`study.frequency.${freq}`)}
                </option>
              ))}
            </select>
          </label>

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
              <button type="button" className="save-button" onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
