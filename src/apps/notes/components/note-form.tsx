"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Pencil, Pin, Plus, Trash2 } from "lucide-react"
import type { Note } from "@/apps/notes/types"
import { NoteRichEditor } from "@/apps/notes/components/note-rich-editor"
import { NoteContent } from "@/apps/notes/components/note-content"
import { useNotesOffline } from "@/apps/notes/offline/notes-offline-provider"
import { isEmptyNoteHtml } from "@/apps/notes/utils/content"
import { isCreatedOnPastDay } from "@/apps/notes/utils/dates"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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
  const { createNote, updateNote, isOnline } = useNotesOffline()
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

    const title = String(formData.get("title") ?? "")
    const isPinned =
      formData.get("isPinned") === "on" || formData.get("isPinned") === "true"
    const nextContent = isEmptyNoteHtml(content) ? "" : content

    const result = isEditing && note
      ? await updateNote({
          id: note.id,
          title,
          content: nextContent,
          isPinned,
        })
      : await createNote({
          title,
          content: nextContent,
          isPinned,
        })

    setIsPending(false)

    if (result.error) {
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
          {!isOnline ? (
            <p className="text-sm text-muted-foreground">
              Saved on this device until you're back online.
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending
                ? "Saving..."
                : isEditing
                  ? isOnline
                    ? "Save changes"
                    : "Save locally"
                  : isOnline
                    ? "Create note"
                    : "Save locally"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type NoteViewDialogProps = {
  note: Note
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const NoteViewDialog = ({
  note,
  open,
  onOpenChange,
}: NoteViewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          "inset-0 h-dvh min-h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none",
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto sm:h-auto sm:min-h-0 sm:max-h-[min(90dvh,720px)] sm:w-[calc(100vw-1.5rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
        )}
      >
        <div className="shrink-0 border-b bg-popover px-4 pt-4 pr-12 pb-3">
          <DialogHeader className="pr-0">
            <DialogTitle>{note.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {note.is_pinned ? <Badge variant="secondary">Pinned</Badge> : null}
            <p className="text-xs text-muted-foreground">
              Updated{" "}
              {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <NoteContent html={note.content} className="text-foreground" />
        </div>
      </DialogContent>
    </Dialog>
  )
}

type NoteCardProps = {
  note: Note
}

export const NoteCard = ({ note }: NoteCardProps) => {
  const { deleteNote, togglePin } = useNotesOffline()
  const [viewOpen, setViewOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const canDelete = !isCreatedOnPastDay(note.created_at)

  return (
    <>
      <div className="group relative flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4">
        <button
          type="button"
          onClick={() => setViewOpen(true)}
          className="absolute inset-0 z-0 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`View ${note.title}`}
        />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="pointer-events-none min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {note.is_pinned ? <Badge variant="secondary">Pinned</Badge> : null}
              <p className="text-xs text-muted-foreground">
                Updated{" "}
                {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
              </p>
            </div>
            <h2 className="truncate text-base font-medium">{note.title}</h2>
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              aria-label={note.is_pinned ? "Unpin note" : "Pin note"}
              onClick={async () => {
                setIsPending(true)
                await togglePin(note.id, !note.is_pinned)
                setIsPending(false)
              }}
            >
              <Pin className={`size-3.5 ${note.is_pinned ? "fill-current" : ""}`} />
            </Button>
            <NoteEditorDialog note={note} variant="edit" />
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                aria-label="Delete note"
                onClick={async () => {
                  setIsPending(true)
                  await deleteNote(note.id)
                  setIsPending(false)
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
        <div className="pointer-events-none relative z-10">
          <NoteContent html={note.content} clamp />
        </div>
      </div>
      <NoteViewDialog note={note} open={viewOpen} onOpenChange={setViewOpen} />
    </>
  )
}
