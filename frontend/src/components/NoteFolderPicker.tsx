import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Folder } from '../types'
import './NoteFolderPicker.css'

export function NoteFolderPicker({
  folders,
  selectedIds,
  onChange,
  disabled,
}: {
  folders: Folder[]
  selectedIds: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  function toggleFolder(id: string) {
    const next = selectedIds.includes(id) ? selectedIds.filter((f) => f !== id) : [...selectedIds, id]
    onChange(next)
  }

  const label =
    selectedIds.length === 0
      ? t('common.noFolder')
      : selectedIds.length === 1
        ? (folders.find((f) => f.id === selectedIds[0])?.name ?? t('common.noFolder'))
        : t('noteDetail.foldersCount', { count: selectedIds.length })

  return (
    <div className="note-folder-picker">
      <button type="button" className="notes-template-select" onClick={() => setOpen((v) => !v)} disabled={disabled}>
        📁 {label}
      </button>
      {open && (
        <div className="note-folder-picker-panel">
          {folders.length === 0 && <p className="note-folder-picker-empty">{t('folders.empty')}</p>}
          {folders.map((folder) => (
            <label key={folder.id} className="note-folder-picker-option">
              <input
                type="checkbox"
                checked={selectedIds.includes(folder.id)}
                onChange={() => toggleFolder(folder.id)}
                disabled={disabled}
              />
              <span className="note-folder-picker-dot" style={{ background: folder.color }} />
              {folder.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
