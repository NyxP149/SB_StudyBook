import { useEffect, useState } from 'react'
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from '../api/client'
import type { Template, TemplateInput, TemplateSection } from '../types'
import './TemplatesPage.css'

const EMPTY_SECTION: TemplateSection = { title: '', instructions: '' }

function emptyForm(): TemplateInput {
  return { name: '', description: '', sections: [{ ...EMPTY_SECTION }] }
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateInput>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = () => {
    listTemplates()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur inconnue'))
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
      setError(e instanceof Error ? e.message : 'Échec de la sauvegarde.')
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
      setError(e instanceof Error ? e.message : 'Échec de la suppression.')
    }
  }

  const isEditing = editingId !== null

  return (
    <div className="templates-page">
      <header className="templates-header">
        <div>
          <h1>Mes templates</h1>
          <p>Adapte la structure de la note générée selon le type de discours.</p>
        </div>
        {!isEditing && (
          <button type="button" className="new-template-button" onClick={startCreate}>
            + Nouveau template
          </button>
        )}
      </header>

      {error && <p className="upload-error">{error}</p>}

      {!isEditing && (
        <>
          {!templates && <p className="notes-loading">Chargement…</p>}
          {templates && templates.length === 0 && (
            <div className="notes-empty">
              <span>🗂️</span>
              <p>Aucun template pour l'instant — la structure par défaut sera utilisée.</p>
            </div>
          )}
          {templates && templates.length > 0 && (
            <div className="templates-grid">
              {templates.map((template) => (
                <button key={template.id} type="button" className="template-card" onClick={() => startEdit(template)}>
                  <h3>{template.name}</h3>
                  {template.description && <p>{template.description}</p>}
                  <span className="template-section-count">
                    {template.sections.length} section{template.sections.length > 1 ? 's' : ''}
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
            Nom
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ex : Étude de livre"
            />
          </label>

          <label className="template-field">
            Description (optionnelle)
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="À quoi sert ce template ?"
            />
          </label>

          <div className="template-sections">
            <h3>Sections</h3>
            {form.sections.map((section, i) => (
              <div className="template-section-row" key={i}>
                <div className="template-section-inputs">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(i, { title: e.target.value })}
                    placeholder="Titre de la section"
                  />
                  <textarea
                    value={section.instructions}
                    onChange={(e) => updateSection(i, { instructions: e.target.value })}
                    placeholder="Instructions pour l'IA (ce qu'elle doit écrire dans cette section)"
                    rows={2}
                  />
                </div>
                <button
                  type="button"
                  className="remove-section-button"
                  onClick={() => removeSection(i)}
                  disabled={form.sections.length <= 1}
                  aria-label="Supprimer cette section"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="add-section-button" onClick={addSection}>
              + Ajouter une section
            </button>
          </div>

          <div className="template-form-actions">
            {editingId !== 'new' && (
              <button type="button" className="delete-template-button" onClick={() => editingId && remove(editingId)}>
                Supprimer
              </button>
            )}
            <div className="template-form-actions-right">
              <button type="button" className="cancel-button" onClick={cancelEdit}>
                Annuler
              </button>
              <button type="button" className="save-button" onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
