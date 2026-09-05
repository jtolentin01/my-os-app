"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { NoteCard, NoteEditorDialog } from "@/apps/notes/components/note-form"
import {
  NotesOfflineProvider,
  useNotesOffline,
} from "@/apps/notes/offline/notes-offline-provider"
import type { Note } from "@/apps/notes/types"
import { Input } from "@/components/ui/input"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NotesWorkspaceProps = {
  notes: Note[]
  query?: string
}

const filterNotes = (notes: Note[], query: string) => {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return notes
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(trimmed) ||
      note.content.toLowerCase().includes(trimmed)
  )
}

const NotesWorkspaceContent = ({ query = "" }: { query?: string }) => {
  const router = useRouter()
  const { notes, isOnline, isSyncing, pendingCount } = useNotesOffline()
  const [search, setSearch] = useState(query)
  const visibleNotes = filterNotes(notes, search)

  useEffect(() => {
    setSearch(query)
  }, [query])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="sticky top-14 z-10 -mx-4 flex flex-col gap-4 border-b bg-background/95 px-4 py-4 backdrop-blur-sm md:static md:top-auto md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Capture ideas, reminders, and thoughts in one place.
            </p>
          </div>
          <NoteEditorDialog />
        </div>

        {!isOnline ? (
          <div className="rounded-lg border border-dashed border-border/80 bg-card px-3 py-2 text-sm text-muted-foreground">
            You're offline. Notes are available on this device
            {pendingCount > 0
              ? ` · ${pendingCount} change${pendingCount === 1 ? "" : "s"} saved locally`
              : ""}
            .
          </div>
        ) : null}

        {isOnline && (isSyncing || pendingCount > 0) ? (
          <div className="rounded-lg border border-dashed border-border/80 bg-card px-3 py-2 text-sm text-muted-foreground">
            {isSyncing
              ? "Syncing local changes…"
              : `${pendingCount} local change${pendingCount === 1 ? "" : "s"} waiting to sync`}
          </div>
        ) : null}

        <form
          className="flex min-w-0 flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            const nextQuery = String(formData.get("q") ?? "").trim()
            setSearch(nextQuery)
            if (isOnline) {
              router.push(nextQuery ? `/notes?q=${encodeURIComponent(nextQuery)}` : "/notes")
            }
          }}
        >
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search notes..."
            className="min-w-0 max-w-md flex-1"
          />
          <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
            Search
          </button>
          {search ? (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "ghost" }))}
              onClick={() => {
                setSearch("")
                if (isOnline) {
                  router.push("/notes")
                }
              }}
            >
              Clear
            </button>
          ) : null}
        </form>
      </div>

      {visibleNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card px-4 py-12 text-center">
          <p className="text-sm font-medium">
            {search ? "No notes matched your search." : "No notes yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? "Try a different keyword or clear the search."
              : isOnline
                ? "Create your first note to get started."
                : "Notes you create offline will sync when you're back online."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}

export const NotesWorkspace = ({ notes, query = "" }: NotesWorkspaceProps) => {
  return (
    <NotesOfflineProvider initialNotes={notes}>
      <NotesWorkspaceContent query={query} />
    </NotesOfflineProvider>
  )
}
