import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FLAT_BACKGROUNDS, CHEMISE_BACKGROUNDS, BACKGROUND_PREVIEW } from '../noteBackgrounds'
import { useClickOutside } from '../hooks/useClickOutside'
import '../styles/noteBackgrounds.css'
import './NoteBackgroundPicker.css'

export function NoteBackgroundPicker({
  value,
  onSelect,
  disabled,
}: {
  value: string | null
  onSelect: (next: string | null) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useClickOutside(rootRef, open, () => setOpen(false))

  function pick(next: string | null) {
    onSelect(next)
    setOpen(false)
  }

  return (
    <div className="note-bg-picker" ref={rootRef}>
      <button
        type="button"
        className="note-action-button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
      >
        {t('noteDetail.changeBackground')}
      </button>
      {open && (
        <div className="note-bg-picker-panel">
          <button
            type="button"
            className={`note-bg-swatch note-bg-swatch-default ${!value ? 'active' : ''}`}
            onClick={() => pick(null)}
            title={t('noteDetail.backgroundDefault')}
            aria-label={t('noteDetail.backgroundDefault')}
          />
          {FLAT_BACKGROUNDS.map((key) => (
            <button
              key={key}
              type="button"
              className={`note-bg-swatch ${value === key ? 'active' : ''}`}
              style={{ background: BACKGROUND_PREVIEW[key] }}
              onClick={() => pick(key)}
              title={t(`noteDetail.background.${key}`)}
              aria-label={t(`noteDetail.background.${key}`)}
            />
          ))}
          <span className="note-bg-picker-divider" />
          {CHEMISE_BACKGROUNDS.map((key) => (
            <button
              key={key}
              type="button"
              className={`note-bg-swatch note-bg-swatch-chemise ${value === key ? 'active' : ''}`}
              style={{ background: BACKGROUND_PREVIEW[key] }}
              onClick={() => pick(key)}
              title={t(`noteDetail.background.${key}`)}
              aria-label={t(`noteDetail.background.${key}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
