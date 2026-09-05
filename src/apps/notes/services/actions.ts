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
import type { Note } from "@/apps/notes/types"

const revalidateNotes = () => {
  revalidatePath("/notes")
  revalidatePath("/dashboard")
}

type ActionResult = {
  success?: boolean
  error?: string
  note?: Note
}

export const createNoteAction = async (formData: FormData): Promise<ActionResult> => {
  const parsed = createNoteSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    isPinned: formData.get("isPinned") === "on" || formData.get("isPinned") === "true",
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note data." }
  }

  try {
    const note = await createNote(parsed.data)
    revalidateNotes()
    return { success: true, note }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create note.",
    }
  }
}

export const updateNoteAction = async (formData: FormData): Promise<ActionResult> => {
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
    const note = await updateNote(parsed.data)
    revalidateNotes()
    return { success: true, note }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update note.",
    }
  }
}

export const toggleNotePinAction = async (formData: FormData): Promise<ActionResult> => {
  const id = String(formData.get("id") ?? "")
  const isPinned = formData.get("isPinned") === "true"

  if (!id) {
    return { error: "Note id is required." }
  }

  try {
    const note = await toggleNotePin(id, isPinned)
    revalidateNotes()
    return { success: true, note }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update pin.",
    }
  }
}

export const deleteNoteAction = async (formData: FormData): Promise<ActionResult> => {
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
