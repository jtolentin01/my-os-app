import { createClient } from "@/lib/supabase/server"
import type { Note } from "@/apps/notes/types"
import type { CreateNoteInput, UpdateNoteInput } from "@/apps/notes/schemas/note"
import { sanitizeNoteHtml } from "@/apps/notes/utils/sanitize"

export const getCurrentUserId = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  return user.id
}

export const listNotes = async (query?: string): Promise<Note[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const trimmed = query?.trim()

  let request = supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })

  if (trimmed) {
    const safeQuery = trimmed.replace(/[%(),]/g, " ").trim()
    if (safeQuery) {
      request = request.or(
        `title.ilike.%${safeQuery}%,content.ilike.%${safeQuery}%`
      )
    }
  }

  const { data, error } = await request

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Note[]
}

export const getRecentNotes = async (limit = 5): Promise<Note[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Note[]
}

export const createNote = async (input: CreateNoteInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title: input.title,
      content: sanitizeNoteHtml(input.content),
      is_pinned: input.isPinned ?? false,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Note
}

export const updateNote = async (input: UpdateNoteInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("notes")
    .update({
      title: input.title,
      content: sanitizeNoteHtml(input.content),
      is_pinned: input.isPinned ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Note
}

export const toggleNotePin = async (id: string, isPinned: boolean) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("notes")
    .update({
      is_pinned: isPinned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Note
}

export const deleteNote = async (id: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}
