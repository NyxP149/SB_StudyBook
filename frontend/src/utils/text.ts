// <textarea>.value always reports LF-only line breaks (per the HTML spec),
// but server content can contain CRLF (e.g. text extracted from Windows-authored
// files). Seeding editable state with un-normalized CRLF makes selectionStart/End
// (DOM, LF-based) disagree with string-index math run against that state.
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n')
}
