import { useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { uploadNoteImage } from '../api/client'

export function InsertImageButton({
  textareaRef,
  value,
  onChange,
  disabled,
  onError,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  onError?: (message: string) => void
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const image = await uploadNoteImage(file)
      const placeholder = `![image](note-image:${image.id})`
      const textarea = textareaRef.current
      const start = textarea?.selectionStart ?? value.length
      const end = textarea?.selectionEnd ?? value.length
      const next = value.slice(0, start) + placeholder + value.slice(end)
      onChange(next)
      const cursor = start + placeholder.length
      requestAnimationFrame(() => {
        textarea?.focus()
        textarea?.setSelectionRange(cursor, cursor)
      })
    } catch (e) {
      onError?.(e instanceof Error ? e.message : t('study.errImageUpload'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="note-action-button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? t('upload.sending') : t('noteDetail.insertImage')}
      </button>
    </>
  )
}
