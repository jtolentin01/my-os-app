import sanitizeHtml from "sanitize-html"
import {
  isEmptyNoteHtml,
  preserveBlankParagraphs,
} from "@/apps/notes/utils/content"

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "mark",
  "span",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]

export const sanitizeNoteHtml = (html?: string | null) => {
  if (isEmptyNoteHtml(html)) {
    return ""
  }

  const prepared = preserveBlankParagraphs(html ?? "")

  return preserveBlankParagraphs(
    sanitizeHtml(prepared, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: {
        a: ["href", "target", "rel", "class"],
        span: ["class"],
        mark: ["class"],
        p: ["class", "data-ai-change"],
        ul: ["data-ai-change"],
        ol: ["data-ai-change"],
        li: ["data-ai-change"],
        blockquote: ["data-ai-change"],
        table: ["class", "data-ai-change"],
        thead: ["data-ai-change"],
        tbody: ["data-ai-change"],
        tr: ["data-ai-change"],
        th: ["colspan", "rowspan", "colwidth", "data-ai-change"],
        td: ["colspan", "rowspan", "colwidth", "data-ai-change"],
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
  )
}
