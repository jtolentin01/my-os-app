import type { Note } from "@/apps/notes/types"

const DB_NAME = "my-os-app"
const DB_VERSION = 1
const NOTES_STORE = "notes"
const PENDING_STORE = "pending"

export type PendingAction = "create" | "update" | "delete"

export type PendingChange = {
  noteId: string
  action: PendingAction
  note?: Note
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: "noteId" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const requestPromise = <T,>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

export const getCachedNotes = async (): Promise<Note[]> => {
  const db = await openDb()
  const notes = await requestPromise(
    db.transaction(NOTES_STORE, "readonly").objectStore(NOTES_STORE).getAll()
  )
  return (notes as Note[]).sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
}

export const putCachedNotes = async (notes: Note[]) => {
  const db = await openDb()
  const tx = db.transaction(NOTES_STORE, "readwrite")
  const store = tx.objectStore(NOTES_STORE)
  store.clear()
  for (const note of notes) {
    store.put(note)
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export const putCachedNote = async (note: Note) => {
  const db = await openDb()
  await requestPromise(db.transaction(NOTES_STORE, "readwrite").objectStore(NOTES_STORE).put(note))
}

export const removeCachedNote = async (noteId: string) => {
  const db = await openDb()
  await requestPromise(
    db.transaction(NOTES_STORE, "readwrite").objectStore(NOTES_STORE).delete(noteId)
  )
}

export const getPendingChanges = async (): Promise<PendingChange[]> => {
  const db = await openDb()
  const pending = await requestPromise(
    db.transaction(PENDING_STORE, "readonly").objectStore(PENDING_STORE).getAll()
  )
  return (pending as PendingChange[]) ?? []
}

export const getPendingChange = async (noteId: string) => {
  const db = await openDb()
  return requestPromise(
    db.transaction(PENDING_STORE, "readonly").objectStore(PENDING_STORE).get(noteId)
  ) as Promise<PendingChange | undefined>
}

export const setPendingChange = async (change: PendingChange) => {
  const db = await openDb()
  await requestPromise(
    db.transaction(PENDING_STORE, "readwrite").objectStore(PENDING_STORE).put(change)
  )
}

export const removePendingChange = async (noteId: string) => {
  const db = await openDb()
  await requestPromise(
    db.transaction(PENDING_STORE, "readwrite").objectStore(PENDING_STORE).delete(noteId)
  )
}

export const mergeServerNotesIntoCache = async (serverNotes: Note[]) => {
  const pending = await getPendingChanges()
  const byId = new Map(serverNotes.map((note) => [note.id, note]))

  for (const change of pending) {
    if (change.action === "delete") {
      byId.delete(change.noteId)
      continue
    }
    if (change.note) {
      byId.set(change.noteId, change.note)
    }
  }

  await putCachedNotes([...byId.values()])
  return getCachedNotes()
}

export const queueNoteCreate = async (note: Note) => {
  await putCachedNote(note)
  await setPendingChange({ noteId: note.id, action: "create", note })
}

export const queueNoteUpdate = async (note: Note) => {
  await putCachedNote(note)
  const pending = await getPendingChange(note.id)

  if (pending?.action === "create") {
    await setPendingChange({ noteId: note.id, action: "create", note })
    return
  }

  if (pending?.action === "delete") {
    return
  }

  await setPendingChange({ noteId: note.id, action: "update", note })
}

export const queueNoteDelete = async (noteId: string) => {
  const pending = await getPendingChange(noteId)
  await removeCachedNote(noteId)

  if (pending?.action === "create") {
    await removePendingChange(noteId)
    return
  }

  await setPendingChange({ noteId, action: "delete" })
}
