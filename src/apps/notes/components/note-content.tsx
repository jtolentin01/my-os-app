import { cn } from "@/lib/utils"
import { isEmptyNoteHtml } from "@/apps/notes/utils/content"
import { sanitizeNoteHtml } from "@/apps/notes/utils/sanitize"

type NoteContentProps = {
  html?: string | null
  className?: string
  clamp?: boolean
}

export const NoteContent = ({ html, className, clamp = false }: NoteContentProps) => {
  if (isEmptyNoteHtml(html)) {
    return (
      <p className={cn("text-sm text-muted-foreground italic", className)}>No content</p>
    )
  }

  const clean = sanitizeNoteHtml(html)

  return (
    <div
      className={cn(
        "note-content min-w-0 max-w-full overflow-hidden text-sm break-words text-muted-foreground",
        clamp && "line-clamp-4",
        className
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
