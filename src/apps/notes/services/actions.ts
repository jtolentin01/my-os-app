"use server"

import { revalidatePath } from "next/cache"
import {
  createNote,
  deleteNote,
  toggleNotePin,
  updateNote,
} from "@/apps/notes/services/notes"
import {
  createNoteSchema,
  updateNoteSchema,
} from "@/apps/notes/schemas/note"

const revalidateNotes = () => {
  revalidatePath("/notes")
  revalidatePath("/dashboard")
}

export const createNoteAction = async (formData: FormData) => {
  const parsed = createNoteSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    isPinned: formData.get("isPinned") === "on" || formData.get("isPinned") === "true",
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note data." }
  }

  try {
    await createNote(parsed.data)
    revalidateNotes()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create note.",
    }
  }
}

export const updateNoteAction = async (formData: FormData) => {
  const parsed = updateNoteSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    isPinned: formData.get("isPinned") === "on" || formData.get("isPinned") === "true",
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note data." }
  }

  try {
    await updateNote(parsed.data)
    revalidateNotes()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update note.",
    }
  }
}

export const toggleNotePinAction = async (formData: FormData) => {
  const id = String(formData.get("id") ?? "")
  const isPinned = formData.get("isPinned") === "true"

  if (!id) {
    return { error: "Note id is required." }
  }

  try {
    await toggleNotePin(id, isPinned)
    revalidateNotes()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update pin.",
    }
  }
}

export const deleteNoteAction = async (formData: FormData) => {
  const id = String(formData.get("id") ?? "")

  if (!id) {
    return { error: "Note id is required." }
  }

  try {
    await deleteNote(id)
    revalidateNotes()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete note.",
    }
  }
}
