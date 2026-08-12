import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  createStudyArgumentsBulk,
  createStudyProgram,
  deleteStudyArgument,
  listStudyArguments,
  listStudyPrograms,
} from '../api/client'
import { formatDateOnly } from '../utils/formatDate'
import type { StudyArgument, StudyArgumentInput, StudyProgram, StudyProgramFrequency } from '../types'
import './StudyPage.css'

const UNITS: StudyProgramFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']

const DEFAULT_COUNT: Record<StudyProgramFrequency, number> = {
  DAILY: 6,
  WEEKLY: 2,
  MONTHLY: 2,
  YEARLY: 1,
}

const COUNT_SHORTCUTS: Record<StudyProgramFrequency, number[]> = {
  DAILY: [2, 4, 6],
  WEEKLY: [2, 6],
  MONTHLY: [2, 6],
  YEARLY: [],
}

function computeDate(unit: StudyProgramFrequency, index: number): string {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  let date: Date
  switch (unit) {
    case 'DAILY':
      date = new Date(y, m, d + index)
      break
    case 'WEEKLY':
      date = new Date(y, m, d + index * 7)
      break
    case 'MONTHLY':
      date = new Date(y, m + index, d)
      break
    case 'YEARLY':
      date = new Date(y + index, m, d)
      break
  }
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function StudyProgramGridPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNewProgram = !id

  const [program, setProgram] = useState<StudyProgram | null>(null)
  const [existingArgs, setExistingArgs] = useState<StudyArgument[] | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<StudyProgramFrequency>('DAILY')
  const [count, setCount] = useState(DEFAULT_COUNT.DAILY)
  const [titles, setTitles] = useState<string[]>(Array(DEFAULT_COUNT.DAILY).fill(''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshExisting = () => {
    if (!id) return
    listStudyPrograms()
      .then((programs) => {
        const found = programs.find((p) => p.id === id) ?? null
        setProgram(found)
        if (found) setUnit(found.frequency)
      })
      .catch(() => setProgram(null))
    listStudyArguments(id)
      .then(setExistingArgs)
      .catch(() => setExistingArgs([]))
  }

  useEffect(refreshExisting, [id])

  useEffect(() => {
    setTitles(Array(count).fill(''))
  }, [count, unit])

  const dates = useMemo(() => titles.map((_, i) => computeDate(unit, i)), [titles.length, unit])

  const setCountFromShortcut = (value: number) => setCount(value)

  const setTitleAt = (index: number, value: string) => {
    setTitles((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleSubmit = async () => {
    setError(null)
    const filled = titles
      .map((title, i) => ({ title: title.trim(), scheduledDate: dates[i] }))
      .filter((entry) => entry.title.length > 0)

    if (filled.length === 0) {
      setError(t('study.grid.errNoTitles'))
      return
    }
    if (isNewProgram && !name.trim()) {
      setError(t('study.grid.errNoName'))
      return
    }

    setSaving(true)
    try {
      let targetProgramId = id
      if (!targetProgramId) {
        const created = await createStudyProgram({ name: name.trim(), frequency: unit })
        targetProgramId = created.id
      }
      const inputs: StudyArgumentInput[] = filled.map((entry) => ({
        title: entry.title,
        scheduledDate: entry.scheduledDate,
        content: '',
        completed: false,
      }))
      await createStudyArgumentsBulk(targetProgramId, inputs)
      navigate(`/study/programs/${targetProgramId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const removeExisting = async (argumentId: string) => {
    if (!window.confirm(t('study.confirmDeleteArgument'))) return
    try {
      await deleteStudyArgument(argumentId)
      refreshExisting()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.deleteFailed'))
    }
  }

  const backLink = isNewProgram ? '/study' : `/study/programs/${id}`

  return (
    <div className="study-page">
      <Link to={backLink} className="back-link">
        {isNewProgram ? t('study.backLink') : t('study.backToProgram')}
      </Link>

      <header className="templates-header">
        <div>
          <h1>{isNewProgram ? t('study.grid.newTitle') : t('study.grid.addTitle', { name: program?.name ?? '…' })}</h1>
          <p>{t('study.grid.subtitle')}</p>
        </div>
      </header>

      {error && <p className="upload-error">{error}</p>}

      {isNewProgram && (
        <label className="template-field">
          {t('common.name')}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('study.namePlaceholder')}
          />
        </label>
      )}

      {isNewProgram && (
        <div className="study-grid-unit-tabs mode-tabs">
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              className={`mode-tab ${unit === u ? 'active' : ''}`}
              onClick={() => {
                setUnit(u)
                setCount(DEFAULT_COUNT[u])
              }}
            >
              {t(`study.grid.unit.${u}`)}
            </button>
          ))}
        </div>
      )}

      <div className="study-grid-count-row">
        <label className="template-field study-grid-count-field">
          {t('study.grid.count')}
          <input
            type="number"
            min={1}
            max={366}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(366, Number(e.target.value) || 1)))}
          />
        </label>
        {COUNT_SHORTCUTS[unit].length > 0 && (
          <div className="study-grid-shortcuts">
            {COUNT_SHORTCUTS[unit].map((shortcut) => (
              <button
                key={shortcut}
                type="button"
                className={`study-grid-shortcut ${count === shortcut ? 'active' : ''}`}
                onClick={() => setCountFromShortcut(shortcut)}
              >
                {shortcut}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="study-grid-boxes">
        {titles.map((title, i) => (
          <label key={i} className="study-grid-box">
            <span className="study-grid-box-date">{formatDateOnly(dates[i], i18n.language)}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitleAt(i, e.target.value)}
              placeholder={t('study.grid.boxPlaceholder')}
            />
          </label>
        ))}
      </div>

      <div className="template-form-actions">
        <div className="template-form-actions-right">
          <button type="button" className="save-button" onClick={handleSubmit} disabled={saving}>
            {saving ? t('common.saving') : t('study.grid.submit')}
          </button>
        </div>
      </div>

      {!isNewProgram && existingArgs && existingArgs.length > 0 && (
        <div className="study-grid-existing">
          <h3>{t('study.grid.existingTitle')}</h3>
          <ul className="study-argument-list">
            {existingArgs.map((argument) => (
              <li key={argument.id} className={`study-argument-row ${argument.completed ? 'completed' : ''}`}>
                <Link to={`/study/arguments/${argument.id}`} className="study-argument-link">
                  <span className="study-argument-date">{formatDateOnly(argument.scheduledDate, i18n.language)}</span>
                  <span className="study-argument-title">{argument.title}</span>
                  {argument.completed && <span className="study-argument-done">✓</span>}
                </Link>
                <button type="button" className="study-program-edit" onClick={() => removeExisting(argument.id)}>
                  {t('common.delete')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
