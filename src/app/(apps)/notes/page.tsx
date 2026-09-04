import { NotesWorkspace } from "@/apps/notes/components/notes-workspace"
import { listNotes } from "@/apps/notes/services/notes"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type NotesPageProps = {
  searchParams: Promise<{ q?: string }>
}

const NotesPage = async ({ searchParams }: NotesPageProps) => {
  const params = await searchParams
  const query = params.q?.trim() || ""

  let notes
  let errorMessage = ""

  try {
    notes = await listNotes(query || undefined)
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to load notes. Make sure the notes migration has been applied."
  }

  if (!notes) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Notes unavailable</CardTitle>
            <CardDescription>
              The notes table may not be set up in Supabase yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Run the SQL in{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                supabase/migrations/202609050002_notes.sql
              </code>{" "}
              in your Supabase SQL editor, then refresh this page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <NotesWorkspace notes={notes} query={query} />
}

export default NotesPage
