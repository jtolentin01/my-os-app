import { NotesWorkspace } from "@/apps/notes/components/notes-workspace"
import { listNotesPage } from "@/apps/notes/services/notes"
import type { Note } from "@/apps/notes/types"
import { parsePageParam, PAGE_SIZE, type PageResult } from "@/lib/pagination"
import { redirect } from "next/navigation"

type NotesPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>
}

const NotesPage = async ({ searchParams }: NotesPageProps) => {
  const params = await searchParams
  const query = params.q?.trim() || ""
  const page = parsePageParam(params.page)

  let result: PageResult<Note> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 1,
  }

  try {
    result = await listNotesPage({ query, page })
  } catch {
    result = {
      items: [],
      total: 0,
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 1,
    }
  }

  if (page > result.totalPages && result.total > 0) {
    const qs = new URLSearchParams()
    if (query) qs.set("q", query)
    qs.set("page", String(result.totalPages))
    redirect(`/notes?${qs.toString()}`)
  }

  return (
    <NotesWorkspace
      notes={result.items}
      query={query}
      page={result.page}
      totalPages={result.totalPages}
      total={result.total}
    />
  )
}

export default NotesPage
