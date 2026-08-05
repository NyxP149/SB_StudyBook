import { useEffect, useState } from 'react'
import { createFolder, deleteFolder, listFolders, updateFolder } from '../api/client'
import type { Folder, FolderInput } from '../types'
import './FoldersPage.css'

const COLOR_PRESETS = [
  { name: 'Or', hex: '#b8863b' },
  { name: 'Sauge', hex: '#3f6f4f' },
  { name: 'Bordeaux', hex: '#8c3b3b' },
  { name: 'Ardoise', hex: '#3f5f7f' },
  { name: 'Prune', hex: '#6b4577' },
  { name: 'Olive', hex: '#6b7a3f' },
]

function emptyForm(): FolderInput {
  return { name: '', color: COLOR_PRESETS[0].hex }
}

export function FoldersPage() {
  const [folders, setFolders] = useState<Folder[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FolderInput>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = () => {
    listFolders()
      .then(setFolders)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur inconnue'))
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
      setError(e instanceof Error ? e.message : 'Échec de la sauvegarde.')
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
      setError(e instanceof Error ? e.message : 'Échec de la suppression.')
    }
  }

  const isEditing = editingId !== null

  return (
    <div className="folders-page">
      <header className="templates-header">
        <div>
          <h1>Mes dossiers</h1>
          <p>Range tes notes par catégorie pour t'y retrouver.</p>
        </div>
        {!isEditing && (
          <button type="button" className="new-template-button" onClick={startCreate}>
            + Nouveau dossier
          </button>
        )}
      </header>

      {error && <p className="upload-error">{error}</p>}

      {!isEditing && (
        <>
          {!folders && <p className="notes-loading">Chargement…</p>}
          {folders && folders.length === 0 && (
            <div className="notes-empty">
              <span>🗂️</span>
              <p>Aucun dossier pour l'instant — toutes les notes apparaissent ensemble.</p>
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
            Nom
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ex : Réunions de semaine"
            />
          </label>

          <div className="template-field">
            Couleur
            <div className="folder-color-picker">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  className={`folder-color-swatch ${form.color === preset.hex ? 'selected' : ''}`}
                  style={{ background: preset.hex }}
                  aria-label={preset.name}
                  onClick={() => setForm((f) => ({ ...f, color: preset.hex }))}
                />
              ))}
            </div>
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
