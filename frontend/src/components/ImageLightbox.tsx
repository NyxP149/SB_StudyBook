import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import './ImageLightbox.css'

export function ImageLightbox({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const { t } = useTranslation()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="image-lightbox-backdrop" onClick={onClose}>
      <button type="button" className="image-lightbox-close" onClick={onClose} aria-label={t('common.close')}>
        ✕
      </button>
      <div className="image-lightbox-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
