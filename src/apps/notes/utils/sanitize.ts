import DOMPurify from "isomorphic-dompurify"
import { isEmptyNoteHtml } from "@/apps/notes/utils/content"

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

const ALLOWED_ATTR = ["class", "href", "rel", "target"]

export const sanitizeNoteHtml = (html?: string | null) => {
  if (isEmptyNoteHtml(html)) {
    return ""
  }

  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}
