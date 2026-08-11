import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from '../api/client'
import type { Template, TemplateInput, TemplateSection } from '../types'
import './TemplatesPage.css'

const EMPTY_SECTION: TemplateSection = { title: '', instructions: '' }

function emptyForm(): TemplateInput {
  return { name: '', description: '', sections: [{ ...EMPTY_SECTION }] }
}

export function TemplatesPage() {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateInput>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = () => {
    listTemplates()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : t('common.unknownError')))
  }

  useEffect(refresh, [])

  const startCreate = () => {
    setEditingId('new')
    setForm(emptyForm())
    setError(null)
  }

  const startEdit = (template: Template) => {
    setEditingId(template.id)
    setForm({
      name: template.name,
      description: template.description ?? '',
      sections: template.sections.map((s) => ({ ...s })),
    })
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setError(null)
  }

  const updateSection = (index: number, patch: Partial<TemplateSection>) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  const addSection = () => setForm((f) => ({ ...f, sections: [...f.sections, { ...EMPTY_SECTION }] }))

  const removeSection = (index: number) =>
    setForm((f) => ({ ...f, sections: f.sections.filter((_, i) => i !== index) }))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editingId && editingId !== 'new') {
        await updateTemplate(editingId, form)
      } else {
        await createTemplate(form)
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
    try {
      await deleteTemplate(id)
      if (editingId === id) setEditingId(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.deleteFailed'))
    }
  }

  const isEditing = editingId !== null

  return (
    <div className="templates-page">
      <header className="templates-header">
        <div>
          <h1>{t('templates.title')}</h1>
          <p>{t('templates.subtitle')}</p>
        </div>
        {!isEditing && (
          <button type="button" className="new-template-button" onClick={startCreate}>
            {t('templates.newTemplate')}
          </button>
        )}
      </header>

      {error && <p className="upload-error">{error}</p>}

      {!isEditing && (
        <>
          {!templates && <p className="notes-loading">{t('common.loading')}</p>}
          {templates && templates.length === 0 && (
            <div className="notes-empty">
              <span>🗂️</span>
              <p>{t('templates.empty')}</p>
            </div>
          )}
          {templates && templates.length > 0 && (
            <div className="templates-grid">
              {templates.map((template) => (
                <button key={template.id} type="button" className="template-card" onClick={() => startEdit(template)}>
                  <h3>{template.name}</h3>
                  {template.description && <p>{template.description}</p>}
                  <span className="template-section-count">
                    {t('templates.sectionCount', { count: template.sections.length })}
                  </span>
                </button>
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
              placeholder={t('templates.namePlaceholder')}
            />
          </label>

          <label className="template-field">
            {t('templates.description')}
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t('templates.descriptionPlaceholder')}
            />
          </label>

          <div className="template-sections">
            <h3>{t('templates.sections')}</h3>
            {form.sections.map((section, i) => (
              <div className="template-section-row" key={i}>
                <div className="template-section-inputs">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(i, { title: e.target.value })}
                    placeholder={t('templates.sectionTitlePlaceholder')}
                  />
                  <textarea
                    value={section.instructions}
                    onChange={(e) => updateSection(i, { instructions: e.target.value })}
                    placeholder={t('templates.sectionInstructionsPlaceholder')}
                    rows={2}
                  />
                </div>
                <button
                  type="button"
                  className="remove-section-button"
                  onClick={() => removeSection(i)}
                  disabled={form.sections.length <= 1}
                  aria-label={t('templates.removeSectionAria')}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="add-section-button" onClick={addSection}>
              {t('templates.addSection')}
            </button>
          </div>

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
