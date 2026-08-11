import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createFolder, deleteFolder, listFolders, updateFolder } from '../api/client'
import type { Folder, FolderInput } from '../types'
import './FoldersPage.css'

const COLOR_PRESETS = [
  { nameKey: 'folders.colorGold', hex: '#b8863b' },
  { nameKey: 'folders.colorSage', hex: '#3f6f4f' },
  { nameKey: 'folders.colorBurgundy', hex: '#8c3b3b' },
  { nameKey: 'folders.colorSlate', hex: '#3f5f7f' },
  { nameKey: 'folders.colorPlum', hex: '#6b4577' },
  { nameKey: 'folders.colorOlive', hex: '#6b7a3f' },
]

function emptyForm(): FolderInput {
  return { name: '', color: COLOR_PRESETS[0].hex }
}

export function FoldersPage() {
  const { t } = useTranslation()
  const [folders, setFolders] = useState<Folder[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FolderInput>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = () => {
    listFolders()
      .then(setFolders)
      .catch((e) => setError(e instanceof Error ? e.message : t('common.unknownError')))
  }

  useEffect(refresh, [])

  const startCreate = () => {
    setEditingId('new')
    setForm(emptyForm())
    setError(null)
  }

  const startEdit = (folder: Folder) => {
    setEditingId(folder.id)
    setForm({ name: folder.name, color: folder.color })
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
        await updateFolder(editingId, form)
      } else {
        await createFolder(form)
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
      await deleteFolder(id)
      if (editingId === id) setEditingId(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.deleteFailed'))
    }
  }

  const isEditing = editingId !== null

  return (
    <div className="folders-page">
      <header className="templates-header">
        <div>
          <h1>{t('folders.title')}</h1>
          <p>{t('folders.subtitle')}</p>
        </div>
        {!isEditing && (
          <button type="button" className="new-template-button" onClick={startCreate}>
            {t('folders.newFolder')}
          </button>
        )}
      </header>

      {error && <p className="upload-error">{error}</p>}

      {!isEditing && (
        <>
          {!folders && <p className="notes-loading">{t('common.loading')}</p>}
          {folders && folders.length === 0 && (
            <div className="notes-empty">
              <span>🗂️</span>
              <p>{t('folders.empty')}</p>
            </div>
          )}
          {folders && folders.length > 0 && (
            <div className="folders-grid">
              {folders.map((folder) => (
                <button key={folder.id} type="button" className="folder-card" onClick={() => startEdit(folder)}>
                  <span className="folder-swatch" style={{ background: folder.color }} />
                  <h3>{folder.name}</h3>
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
              placeholder={t('folders.namePlaceholder')}
            />
          </label>

          <div className="template-field">
            {t('folders.color')}
            <div className="folder-color-picker">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  className={`folder-color-swatch ${form.color === preset.hex ? 'selected' : ''}`}
                  style={{ background: preset.hex }}
                  aria-label={t(preset.nameKey)}
                  onClick={() => setForm((f) => ({ ...f, color: preset.hex }))}
                />
              ))}
            </div>
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
