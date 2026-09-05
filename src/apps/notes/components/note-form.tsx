"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Check, Pencil, Pin, Plus, Sparkles, Trash2, X } from "lucide-react"
import type { Note } from "@/apps/notes/types"
import type { NoteAssistantResult } from "@/apps/notes/schemas/assistant"
import { NoteAssistantPanel } from "@/apps/notes/components/note-assistant-panel"
import { NoteRichEditor } from "@/apps/notes/components/note-rich-editor"
import { NoteContent } from "@/apps/notes/components/note-content"
import { useNotesOffline } from "@/apps/notes/offline/notes-offline-provider"
import {
  markAiContentChanges,
  stripAiChangeMarkup,
} from "@/apps/notes/utils/ai-change-markup"
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useModalHistory } from "@/platform/hooks/use-modal-history"

type AiPendingEdit = {
  message: string
  baselineTitle: string
  baselineContent: string
}

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
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [title, setTitle] = useState(note?.title ?? "")
  const [content, setContent] = useState(note?.content ?? "")
  const [aiPending, setAiPending] = useState<AiPendingEdit | null>(null)
  const isEditing = variant === "edit" && Boolean(note)
  const editorHistoryId = `note-editor-${note?.id ?? "new"}`

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setTitle(note?.title ?? "")
      setContent(note?.content ?? "")
      setError("")
      setAssistantOpen(false)
      setAiPending(null)
      return
    }

    setAssistantOpen(false)
    setAiPending(null)
  }

  useModalHistory({
    open,
    onClose: () => handleOpenChange(false),
    id: editorHistoryId,
  })

  const handleProposeAssistant = (result: NoteAssistantResult) => {
    const baselineTitle = aiPending?.baselineTitle ?? title
    const baselineContent = aiPending?.baselineContent ?? content

    setAiPending({
      message: result.message,
      baselineTitle,
      baselineContent,
    })

    if (result.title) {
      setTitle(result.title)
    }
    if (result.content) {
      setContent(markAiContentChanges(baselineContent, result.content))
    }
    setAssistantOpen(false)
  }

  const handleAcceptAiEdit = () => {
    setContent((current) => stripAiChangeMarkup(current))
    setAiPending(null)
  }

  const handleDiscardAiEdit = () => {
    if (!aiPending) return
    setTitle(aiPending.baselineTitle)
    setContent(aiPending.baselineContent)
    setAiPending(null)
  }

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    setError("")

    const nextTitle = String(formData.get("title") ?? title).trim()
    const isPinned =
      formData.get("isPinned") === "on" || formData.get("isPinned") === "true"
    const nextContent = isEmptyNoteHtml(content)
      ? ""
      : stripAiChangeMarkup(content)

    const result = isEditing && note
      ? await updateNote({
          id: note.id,
          title: nextTitle,
          content: nextContent,
          isPinned,
        })
      : await createNote({
          title: nextTitle,
          content: nextContent,
          isPinned,
        })

    setIsPending(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setAiPending(null)
    setOpen(false)
  }

  const renderAssistantPanel = () =>
    open ? (
      <NoteAssistantPanel
        title={title}
        content={content}
        isOnline={isOnline}
        hasPendingEdit={Boolean(aiPending)}
        onPropose={handleProposeAssistant}
        onAccept={handleAcceptAiEdit}
        onDiscard={handleDiscardAiEdit}
      />
    ) : null

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
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          "w-[calc(100vw-1.5rem)] max-w-5xl",
          "max-h-[min(92dvh,860px)]"
        )}
      >
        <div className="shrink-0 border-b px-4 pt-4 pr-12 pb-3">
          <DialogHeader className="pr-0">
            <DialogTitle>{isEditing ? "Edit note" : "New note"}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form
            key={open ? `open-${note?.id ?? "new"}` : "closed"}
            action={handleSubmit}
            className="flex min-h-0 min-w-0 flex-col"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
              {aiPending ? (
                <div className="flex flex-col gap-2 rounded-lg border border-teal-500/35 bg-teal-500/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-teal-50/90">
                    AI updated this note. Review the highlighted changes.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={handleAcceptAiEdit}>
                      <Check className="size-3.5" />
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleDiscardAiEdit}
                    >
                      <X className="size-3.5" />
                      Discard
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor={`note-title-${note?.id ?? "new"}`}>Title</Label>
                <Input
                  id={`note-title-${note?.id ?? "new"}`}
                  name="title"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Note title"
                  className={cn(
                    aiPending &&
                      title !== aiPending.baselineTitle &&
                      "note-ai-pending-field"
                  )}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Content</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setAssistantOpen(true)}
                  >
                    <Sparkles className="size-3.5" />
                    AI
                  </Button>
                </div>
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
                  Saved on this device until you are back online.
                </p>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter className="mx-0 mb-0 rounded-none border-t">
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

          <aside className="hidden min-h-0 border-l lg:flex lg:flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {renderAssistantPanel()}
            </div>
          </aside>
        </div>

        <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>My OS AI</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              {renderAssistantPanel()}
            </div>
          </SheetContent>
        </Sheet>
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
  useModalHistory({
    open,
    onClose: () => onOpenChange(false),
    id: `note-view-${note.id}`,
  })

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
        <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto px-4 py-4">
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
      <div className="group relative flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-xl border border-border/70 bg-card p-4">
        <button
          type="button"
          onClick={() => setViewOpen(true)}
          className="absolute inset-0 z-0 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`View ${note.title}`}
        />
        <div className="relative z-10 flex min-w-0 items-start justify-between gap-3">
          <div className="pointer-events-none min-w-0 flex-1 overflow-hidden">
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
        <div className="pointer-events-none relative z-10 min-w-0 overflow-hidden">
          <NoteContent html={note.content} clamp />
        </div>
      </div>
      <NoteViewDialog note={note} open={viewOpen} onOpenChange={setViewOpen} />
    </>
  )
}
