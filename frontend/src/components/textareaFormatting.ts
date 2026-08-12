export type Selection = { value: string; start: number; end: number }

export function toggleWrap(value: string, start: number, end: number, before: string, after: string, placeholder: string): Selection {
  const selected = value.slice(start, end)

  if (selected === '') {
    const next = value.slice(0, start) + before + placeholder + after + value.slice(end)
    return { value: next, start: start + before.length, end: start + before.length + placeholder.length }
  }

  if (selected.length >= before.length + after.length && selected.startsWith(before) && selected.endsWith(after)) {
    const unwrapped = selected.slice(before.length, selected.length - after.length)
    const next = value.slice(0, start) + unwrapped + value.slice(end)
    return { value: next, start, end: start + unwrapped.length }
  }

  const next = value.slice(0, start) + before + selected + after + value.slice(end)
  return { value: next, start: start + before.length, end: start + before.length + selected.length }
}

export function toggleLinePrefix(value: string, start: number, end: number, prefix: string): Selection {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const nextBreak = value.indexOf('\n', end)
  const lineEnd = nextBreak === -1 ? value.length : nextBreak

  const block = value.slice(lineStart, lineEnd)
  const lines = block.split('\n')
  const nonEmpty = lines.filter((l) => l.trim() !== '')
  const allPrefixed = nonEmpty.length > 0 && nonEmpty.every((l) => l.startsWith(prefix))

  const newLines = lines.map((l) => {
    if (l.trim() === '') return l
    if (allPrefixed) return l.startsWith(prefix) ? l.slice(prefix.length) : l
    return l.startsWith(prefix) ? l : prefix + l
  })
  const newBlock = newLines.join('\n')
  const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd)
  return { value: next, start: lineStart, end: lineStart + newBlock.length }
}

export function uppercaseSelection(value: string, start: number, end: number): Selection {
  if (start === end) return { value, start, end }
  const selected = value.slice(start, end).toLocaleUpperCase()
  const next = value.slice(0, start) + selected + value.slice(end)
  return { value: next, start, end: start + selected.length }
}
