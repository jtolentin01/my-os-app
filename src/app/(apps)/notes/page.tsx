import { NotesWorkspace } from "@/apps/notes/components/notes-workspace"
import { listNotes } from "@/apps/notes/services/notes"
import type { Note } from "@/apps/notes/types"

type NotesPageProps = {
  searchParams: Promise<{ q?: string }>
}

const NotesPage = async ({ searchParams }: NotesPageProps) => {
  const params = await searchParams
  const query = params.q?.trim() || ""

  let notes: Note[] = []

  try {
    notes = await listNotes()
  } catch {
    notes = []
  }

  return <NotesWorkspace notes={notes} query={query} />
}

export default NotesPage
