import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import type { Components } from 'react-markdown'
import type { ReactNode } from 'react'
import { fetchNoteImageObjectUrl } from '../api/client'
import { AuthedImage } from './AuthedImage'

const NOTE_IMAGE_PREFIX = 'note-image:'

// react-markdown sanitise les URLs de schéma inconnu (protection XSS sur les
// liens) et viderait sinon notre "note-image:{id}" avant qu'il n'atteigne le
// composant img ci-dessous.
function urlTransform(url: string): string {
  return url.startsWith(NOTE_IMAGE_PREFIX) ? url : defaultUrlTransform(url)
}

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
  img: ({ src, alt }) => {
    const url = typeof src === 'string' ? src : ''
    if (url.startsWith(NOTE_IMAGE_PREFIX)) {
      return (
        <AuthedImage
          imageId={url.slice(NOTE_IMAGE_PREFIX.length)}
          alt={alt ?? ''}
          className="note-md-image"
          fetcher={fetchNoteImageObjectUrl}
        />
      )
    }
    return <img src={url} alt={alt ?? ''} className="note-md-image" />
  },
}

export function NoteMarkdown({ content }: { content: string }) {
  return (
    <div className="note-markdown">
      <ReactMarkdown components={components} urlTransform={urlTransform}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
