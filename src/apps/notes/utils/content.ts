export const isEmptyNoteHtml = (html?: string | null) => {
  if (!html) return true
  const text = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .trim()
  return text.length === 0
}

export const toPlainNoteText = (html?: string | null) => {
  if (!html) return ""
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n+/g, " ")
    .trim()
}
