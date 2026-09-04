"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Pencil, Pin, Plus, Trash2 } from "lucide-react"
import {
  createNoteAction,
  deleteNoteAction,
  toggleNotePinAction,
  updateNoteAction,
} from "@/apps/notes/services/actions"
import type { Note } from "@/apps/notes/types"
import { NoteRichEditor } from "@/apps/notes/components/note-rich-editor"
import { NoteContent } from "@/apps/notes/components/note-content"
import { isEmptyNoteHtml } from "@/apps/notes/utils/content"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type NoteEditorDialogProps = {
  note?: Note
  variant?: "create" | "edit"
}

export const NoteEditorDialog = ({
  note,
  variant = "create",
}: NoteEditorDialogProps) => {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [content, setContent] = useState(note?.content ?? "")
  const isEditing = variant === "edit" && Boolean(note)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setContent(note?.content ?? "")
      setError("")
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    setError("")

    formData.set("content", isEmptyNoteHtml(content) ? "" : content)

    const result = isEditing
      ? await updateNoteAction(formData)
      : await createNoteAction(formData)

    setIsPending(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEditing ? (
        <DialogTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Edit note" />}
        >
          <Pencil className="size-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button className="w-fit" />}>
          <Plus className="size-4" />
          New note
        </DialogTrigger>
      )}
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit note" : "New note"}</DialogTitle>
        </DialogHeader>
        <form
          key={open ? `open-${note?.id ?? "new"}` : "closed"}
          action={handleSubmit}
          className="flex min-w-0 flex-col gap-4"
        >
          {note ? <input type="hidden" name="id" value={note.id} /> : null}
          <input type="hidden" name="content" value={content} />
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={`note-title-${note?.id ?? "new"}`}>Title</Label>
            <Input
              id={`note-title-${note?.id ?? "new"}`}
              name="title"
              required
              defaultValue={note?.title ?? ""}
              placeholder="Note title"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label>Content</Label>
            {open ? (
              <NoteRichEditor value={content} onChange={setContent} />
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPinned"
              defaultChecked={note?.is_pinned ?? false}
              className="size-4 rounded border"
            />
            Pin this note
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Saving..." : isEditing ? "Save changes" : "Create note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type NoteCardProps = {
  note: Note
}

export const NoteCard = ({ note }: NoteCardProps) => {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {note.is_pinned ? <Badge variant="secondary">Pinned</Badge> : null}
            <p className="text-xs text-muted-foreground">
              Updated{" "}
              {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
            </p>
          </div>
          <h2 className="truncate text-base font-medium">{note.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <form
            action={async (formData) => {
              await toggleNotePinAction(formData)
            }}
          >
            <input type="hidden" name="id" value={note.id} />
            <input
              type="hidden"
              name="isPinned"
              value={note.is_pinned ? "false" : "true"}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label={note.is_pinned ? "Unpin note" : "Pin note"}
            >
              <Pin className={`size-3.5 ${note.is_pinned ? "fill-current" : ""}`} />
            </Button>
          </form>
          <NoteEditorDialog note={note} variant="edit" />
          <form
            action={async (formData) => {
              await deleteNoteAction(formData)
            }}
          >
            <input type="hidden" name="id" value={note.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Delete note"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </form>
        </div>
      </div>
      <NoteContent html={note.content} clamp />
    </div>
  )
}
