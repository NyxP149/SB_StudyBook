import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import type { ReactNode } from 'react'

const SECTION_ICONS: Array<[RegExp, string]> = [
  [/th[eè]me/i, '🎯'],
  [/r[eé]sum[eé]/i, '📝'],
  [/versets?/i, '📖'],
  [/perles?/i, '💎'],
  [/applications?/i, '❤️'],
  [/notes? personnelles?/i, '✍️'],
  [/transcription/i, '🎧'],
]

function iconFor(text: string): string | null {
  const found = SECTION_ICONS.find(([pattern]) => pattern.test(text))
  return found ? found[1] : null
}

function textOf(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(textOf).join('')
  return ''
}

const components: Components = {
  h1: ({ children }) => {
    const text = textOf(children)
    const icon = iconFor(text)
    return (
      <h2 className="note-md-h1">
        {icon && <span className="note-md-icon">{icon}</span>}
        {text.replace(/^[^\w]*\s*/u, '')}
      </h2>
    )
  },
  h2: ({ children }) => {
    const text = textOf(children)
    const icon = iconFor(text)
    return (
      <h3 className="note-md-h2">
        {icon && <span className="note-md-icon">{icon}</span>}
        {text}
      </h3>
    )
  },
  h3: ({ children }) => <h4 className="note-md-h3">{children}</h4>,
}

export function NoteMarkdown({ content }: { content: string }) {
  return (
    <div className="note-markdown">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  )
}
