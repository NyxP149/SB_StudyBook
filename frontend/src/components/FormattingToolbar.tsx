import { useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { HIGHLIGHT_COLORS, type HighlightColor } from './formattingColors'
import { toggleLinePrefix, toggleWrap, uppercaseSelection, type Selection } from './textareaFormatting'
import '../styles/highlightColors.css'
import './FormattingToolbar.css'

export function FormattingToolbar({
  textareaRef,
  value,
  onChange,
  disabled,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [highlightOpen, setHighlightOpen] = useState(false)

  function apply(result: Selection) {
    onChange(result.value)
    const textarea = textareaRef.current
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(result.start, result.end)
    })
  }

  function selectionRange(): [number, number] {
    const textarea = textareaRef.current
    return [textarea?.selectionStart ?? value.length, textarea?.selectionEnd ?? value.length]
  }

  function bold() {
    const [start, end] = selectionRange()
    apply(toggleWrap(value, start, end, '**', '**', t('formatting.boldPlaceholder')))
  }

  function italic() {
    const [start, end] = selectionRange()
    apply(toggleWrap(value, start, end, '*', '*', t('formatting.italicPlaceholder')))
  }

  function underline() {
    const [start, end] = selectionRange()
    apply(toggleWrap(value, start, end, '<u>', '</u>', t('formatting.underlinePlaceholder')))
  }

  function highlight(color: HighlightColor) {
    const [start, end] = selectionRange()
    apply(toggleWrap(value, start, end, `<mark class="hl-${color}">`, '</mark>', t('formatting.highlightPlaceholder')))
    setHighlightOpen(false)
  }

  function uppercase() {
    const [start, end] = selectionRange()
    apply(uppercaseSelection(value, start, end))
  }

  function heading() {
    const [start, end] = selectionRange()
    apply(toggleLinePrefix(value, start, end, '# '))
  }

  function bulletList() {
    const [start, end] = selectionRange()
    apply(toggleLinePrefix(value, start, end, '- '))
  }

  return (
    // Prevents the textarea from blurring on click, so its selection
    // (selectionStart/End) is still intact when the handlers above read it.
    <div className="formatting-toolbar" onMouseDown={(e) => e.preventDefault()}>
      <button type="button" className="fmt-button" onClick={bold} disabled={disabled} title={t('formatting.bold')} aria-label={t('formatting.bold')}>
        <strong>B</strong>
      </button>
      <button type="button" className="fmt-button" onClick={italic} disabled={disabled} title={t('formatting.italic')} aria-label={t('formatting.italic')}>
        <em>I</em>
      </button>
      <button
        type="button"
        className="fmt-button fmt-underline"
        onClick={underline}
        disabled={disabled}
        title={t('formatting.underline')}
        aria-label={t('formatting.underline')}
      >
        U
      </button>
      <button type="button" className="fmt-button" onClick={uppercase} disabled={disabled} title={t('formatting.uppercase')} aria-label={t('formatting.uppercase')}>
        AB
      </button>
      <button type="button" className="fmt-button" onClick={heading} disabled={disabled} title={t('formatting.heading')} aria-label={t('formatting.heading')}>
        H
      </button>
      <button type="button" className="fmt-button" onClick={bulletList} disabled={disabled} title={t('formatting.bulletList')} aria-label={t('formatting.bulletList')}>
        ☰
      </button>
      <div className="fmt-highlight-picker">
        <button
          type="button"
          className="fmt-button"
          onClick={() => setHighlightOpen((v) => !v)}
          disabled={disabled}
          title={t('formatting.highlight')}
          aria-label={t('formatting.highlight')}
        >
          🖊
        </button>
        {highlightOpen && (
          <div className="fmt-highlight-panel">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`fmt-highlight-swatch hl-${color}`}
                onClick={() => highlight(color)}
                title={t(`formatting.highlightColor.${color}`)}
                aria-label={t(`formatting.highlightColor.${color}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
