import { marked } from "marked"
import sanitizeHtml from "sanitize-html"

marked.setOptions({
  gfm: true,
  breaks: true,
})

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div",
]

export const renderChatMarkdown = (content: string) => {
  const trimmed = content.trim()
  if (!trimmed) return ""

  const html = marked.parse(trimmed, { async: false }) as string
  const withScrollableTables = html.replace(
    /<table([\s>])/gi,
    '<div class="chat-table-scroll"><table$1'
  ).replace(/<\/table>/gi, "</table></div>")

  return sanitizeHtml(withScrollableTables, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      code: ["class"],
      div: ["class"],
      th: ["colspan", "rowspan", "align"],
      td: ["colspan", "rowspan", "align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
    },
  })
}
