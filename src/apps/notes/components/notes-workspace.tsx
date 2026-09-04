import Link from "next/link"
import { NoteCard, NoteEditorDialog } from "@/apps/notes/components/note-form"
import type { Note } from "@/apps/notes/types"
import { Input } from "@/components/ui/input"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NotesWorkspaceProps = {
  notes: Note[]
  query?: string
}

export const NotesWorkspace = ({ notes, query = "" }: NotesWorkspaceProps) => {
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

        <form className="flex min-w-0 flex-wrap gap-2" action="/notes" method="get">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search notes..."
            className="min-w-0 max-w-md flex-1"
          />
          <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
            Search
          </button>
          {query ? (
            <Link href="/notes" className={cn(buttonVariants({ variant: "ghost" }))}>
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="text-sm font-medium">
            {query ? "No notes matched your search." : "No notes yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query
              ? "Try a different keyword or clear the search."
              : "Create your first note to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}
