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
        p: ["class"],
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
