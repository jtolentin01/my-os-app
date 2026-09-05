export const isEmptyNoteHtml = (html?: string | null) => {
  if (!html) return true
  if (/<table[\s>]/i.test(html)) return false
  const text = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .trim()
  return text.length === 0
}

export const preserveBlankParagraphs = (html: string) =>
  html.replace(/<p([^>]*)>(?:\s|&nbsp;)*<\/p>/gi, "<p$1><br></p>")

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
