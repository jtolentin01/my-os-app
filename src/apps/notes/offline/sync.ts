import {
  createNoteAction,
  deleteNoteAction,
  updateNoteAction,
} from "@/apps/notes/services/actions"
import {
  getPendingChanges,
  putCachedNote,
  removePendingChange,
} from "@/apps/notes/offline/db"

export const syncPendingNotes = async () => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, error: "" }
  }

  const pending = await getPendingChanges()
  if (pending.length === 0) {
    return { synced: 0, error: "" }
  }

  let synced = 0

  for (const change of pending) {
    if (change.action === "delete") {
      const formData = new FormData()
      formData.set("id", change.noteId)
      const result = await deleteNoteAction(formData)
      if (result?.error) {
        return { synced, error: result.error }
      }
      await removePendingChange(change.noteId)
      synced += 1
      continue
    }

    if (!change.note) {
      await removePendingChange(change.noteId)
      continue
    }

    const formData = new FormData()
    formData.set("id", change.note.id)
    formData.set("title", change.note.title)
    formData.set("content", change.note.content)
    formData.set("isPinned", change.note.is_pinned ? "true" : "false")

    const result =
      change.action === "create"
        ? await createNoteAction(formData)
        : await updateNoteAction(formData)

    if (result?.error) {
      return { synced, error: result.error }
    }

    if (result?.note) {
      await putCachedNote(result.note)
    }

    await removePendingChange(change.noteId)
    synced += 1
  }

  return { synced, error: "" }
}
