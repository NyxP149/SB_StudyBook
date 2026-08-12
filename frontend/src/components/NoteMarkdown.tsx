import { cloneElement, isValidElement } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import type { Components } from 'react-markdown'
import type { ReactElement, ReactNode } from 'react'
import { fetchNoteImageObjectUrl } from '../api/client'
import { AuthedImage } from './AuthedImage'
import { HIGHLIGHT_COLORS } from './formattingColors'
import '../styles/highlightColors.css'

const NOTE_IMAGE_PREFIX = 'note-image:'

// Only <u> and <mark class="hl-*"> raw HTML survives sanitization — everything
// else react-markdown would otherwise strip (or leave dangerously unescaped
// without rehype-sanitize) stays plain text.
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u', 'mark'],
  attributes: {
    ...defaultSchema.attributes,
    mark: [['className', ...HIGHLIGHT_COLORS.map((c) => `hl-${c}`)]],
  },
}

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

// Headings can contain inline formatting (bold/highlight/underline from the
// toolbar), so `children` is a React node tree, not a plain string — these
// two walk that tree instead of rendering only a flattened string.
function textOf(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

function stripLeadingIcon(node: ReactNode): ReactNode {
  if (typeof node === 'string') return node.replace(/^[^\w]*\s*/u, '')
  if (Array.isArray(node)) {
    if (node.length === 0) return node
    return [stripLeadingIcon(node[0]), ...node.slice(1)]
  }
  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>
    return cloneElement(element, {}, stripLeadingIcon(element.props.children))
  }
  return node
}

const components: Components = {
  h1: ({ children }) => {
    const text = textOf(children)
    const icon = iconFor(text)
    return (
      <h2 className="note-md-h1">
        {icon && <span className="note-md-icon">{icon}</span>}
        {stripLeadingIcon(children)}
      </h2>
    )
  },
  h2: ({ children }) => {
    const text = textOf(children)
    const icon = iconFor(text)
    return (
      <h3 className="note-md-h2">
        {icon && <span className="note-md-icon">{icon}</span>}
        {children}
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

export function NoteMarkdown({ content, backgroundClass }: { content: string; backgroundClass?: string }) {
  return (
    <div className={`note-markdown ${backgroundClass ?? ''}`}>
      <ReactMarkdown
        components={components}
        urlTransform={urlTransform}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
