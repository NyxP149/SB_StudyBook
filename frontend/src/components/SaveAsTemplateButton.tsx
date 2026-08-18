import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createTemplate, extractTemplateSectionsAI } from '../api/client'
import { extractTemplateSections } from '../utils/extractTemplateSections'
import { useClickOutside } from '../hooks/useClickOutside'
import type { TemplateSection } from '../types'
import './SaveAsTemplateButton.css'

export function SaveAsTemplateButton({ noteMarkdown, disabled }: { noteMarkdown: string; disabled?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useClickOutside(rootRef, open, () => setOpen(false))

  function toggle() {
    setOpen((v) => !v)
    setError(null)
    setSuccess(false)
  }

  async function save() {
    setSaving(true)
    setError(null)

    let sections: TemplateSection[]
    try {
      sections = await extractTemplateSectionsAI(noteMarkdown)
    } catch {
      // L'IA n'a pas pu identifier les sections (clé absente, quota, réseau...) :
      // on retombe sur l'extraction locale par titres markdown (#/##/###).
      sections = extractTemplateSections(noteMarkdown, t('noteDetail.saveAsTemplateInstructions'))
    }
    if (sections.length === 0) {
      setError(t('noteDetail.saveAsTemplateNoHeadings'))
      setSaving(false)
      return
    }

    try {
      await createTemplate({ name: name.trim(), description: '', sections })
      setSuccess(true)
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="save-as-template" ref={rootRef}>
      <button type="button" className="note-action-button" onClick={toggle} disabled={disabled}>
        {t('noteDetail.saveAsTemplate')}
      </button>
      {open && (
        <div className="save-as-template-panel">
          {success ? (
            <p className="save-as-template-success">{t('noteDetail.saveAsTemplateSuccess')}</p>
          ) : (
            <>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('noteDetail.saveAsTemplateNamePlaceholder')}
                disabled={saving}
              />
              <button type="button" className="note-action-button primary" onClick={save} disabled={saving || !name.trim()}>
                {saving ? t('noteDetail.saving') : t('common.save')}
              </button>
            </>
          )}
          {error && <p className="upload-error">{error}</p>}
        </div>
      )}
    </div>
  )
}
