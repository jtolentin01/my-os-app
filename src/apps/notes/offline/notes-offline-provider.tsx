"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { useRouter } from "next/navigation"
import {
  createNoteAction,
  deleteNoteAction,
  toggleNotePinAction,
  updateNoteAction,
} from "@/apps/notes/services/actions"
import type { Note } from "@/apps/notes/types"
import { isEmptyNoteHtml } from "@/apps/notes/utils/content"
import { isCreatedOnPastDay } from "@/apps/notes/utils/dates"
import { sanitizeNoteHtml } from "@/apps/notes/utils/sanitize"
import {
  getCachedNotes,
  getPendingChanges,
  mergeServerNotesIntoCache,
  putCachedNote,
  queueNoteCreate,
  queueNoteDelete,
  queueNoteUpdate,
  removeCachedNote,
} from "@/apps/notes/offline/db"
import { syncPendingNotes } from "@/apps/notes/offline/sync"
import { useOnlineStatus } from "@/platform/offline/use-online-status"

type NoteInput = {
  id?: string
  title: string
  content: string
  isPinned: boolean
}

type NotesOfflineContextValue = {
  notes: Note[]
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  createNote: (input: NoteInput) => Promise<{ error?: string }>
  updateNote: (input: NoteInput & { id: string }) => Promise<{ error?: string }>
  deleteNote: (id: string) => Promise<{ error?: string }>
  togglePin: (id: string, isPinned: boolean) => Promise<{ error?: string }>
}

const NotesOfflineContext = createContext<NotesOfflineContextValue | null>(null)

const sortNotes = (notes: Note[]) =>
  [...notes].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

type NotesOfflineProviderProps = {
  initialNotes: Note[]
  children: React.ReactNode
}

export const NotesOfflineProvider = ({
  initialNotes,
  children,
}: NotesOfflineProviderProps) => {
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [, startTransition] = useTransition()
  const syncingRef = useRef(false)
  const initialNotesKey = initialNotes
    .map((note) => `${note.id}:${note.updated_at}`)
    .join("|")

  const refreshPendingCount = useCallback(async () => {
    const pending = await getPendingChanges()
    setPendingCount(pending.length)
  }, [])

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      try {
        if (initialNotes.length > 0) {
          const merged = await mergeServerNotesIntoCache(initialNotes)
          if (!cancelled) {
            setNotes(merged)
          }
        } else {
          const cached = await getCachedNotes()
          if (!cancelled && cached.length > 0) {
            setNotes(cached)
          }
        }
        if (!cancelled) {
          await refreshPendingCount()
        }
      } catch {
        if (!cancelled && initialNotes.length > 0) {
          setNotes(initialNotes)
        }
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [initialNotes, initialNotesKey, refreshPendingCount])

  const runSync = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) {
      return
    }

    syncingRef.current = true
    setIsSyncing(true)
    try {
      const result = await syncPendingNotes()
      const cached = await getCachedNotes()
      setNotes(cached)
      await refreshPendingCount()
      if (result.synced > 0) {
        startTransition(() => {
          router.refresh()
        })
      }
    } finally {
      syncingRef.current = false
      setIsSyncing(false)
    }
  }, [refreshPendingCount, router])

  useEffect(() => {
    if (isOnline) {
      void runSync()
    }
  }, [isOnline, runSync])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void runSync()
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [runSync])

  const createNote = useCallback(
    async (input: NoteInput) => {
      const now = new Date().toISOString()
      const note: Note = {
        id: input.id ?? crypto.randomUUID(),
        user_id: "local",
        title: input.title.trim(),
        content: sanitizeNoteHtml(isEmptyNoteHtml(input.content) ? "" : input.content),
        is_pinned: input.isPinned,
        created_at: now,
        updated_at: now,
      }

      if (!navigator.onLine) {
        await queueNoteCreate(note)
        setNotes((current) => sortNotes([note, ...current.filter((item) => item.id !== note.id)]))
        await refreshPendingCount()
        return {}
      }

      const formData = new FormData()
      formData.set("id", note.id)
      formData.set("title", note.title)
      formData.set("content", note.content)
      formData.set("isPinned", note.is_pinned ? "true" : "false")
      const result = await createNoteAction(formData)
      if (result.error) {
        return { error: result.error }
      }
      const saved = result.note ?? note
      await putCachedNote(saved)
      setNotes((current) => sortNotes([saved, ...current.filter((item) => item.id !== saved.id)]))
      startTransition(() => router.refresh())
      return {}
    },
    [refreshPendingCount, router]
  )

  const updateNote = useCallback(
    async (input: NoteInput & { id: string }) => {
      const existing = notes.find((note) => note.id === input.id)
      const now = new Date().toISOString()
      const note: Note = {
        id: input.id,
        user_id: existing?.user_id ?? "local",
        title: input.title.trim(),
        content: sanitizeNoteHtml(isEmptyNoteHtml(input.content) ? "" : input.content),
        is_pinned: input.isPinned,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      }

      if (!navigator.onLine) {
        await queueNoteUpdate(note)
        setNotes((current) => sortNotes(current.map((item) => (item.id === note.id ? note : item))))
        await refreshPendingCount()
        return {}
      }

      const formData = new FormData()
      formData.set("id", note.id)
      formData.set("title", note.title)
      formData.set("content", note.content)
      formData.set("isPinned", note.is_pinned ? "true" : "false")
      const result = await updateNoteAction(formData)
      if (result.error) {
        return { error: result.error }
      }
      const saved = result.note ?? note
      await putCachedNote(saved)
      setNotes((current) => sortNotes(current.map((item) => (item.id === saved.id ? saved : item))))
      startTransition(() => router.refresh())
      return {}
    },
    [notes, refreshPendingCount, router]
  )

  const deleteNote = useCallback(
    async (id: string) => {
      const existing = notes.find((note) => note.id === id)
      if (existing && isCreatedOnPastDay(existing.created_at)) {
        return { error: "You can't delete notes from previous days." }
      }

      if (!navigator.onLine) {
        await queueNoteDelete(id)
        setNotes((current) => current.filter((item) => item.id !== id))
        await refreshPendingCount()
        return {}
      }

      const formData = new FormData()
      formData.set("id", id)
      const result = await deleteNoteAction(formData)
      if (result.error) {
        return { error: result.error }
      }
      setNotes((current) => current.filter((item) => item.id !== id))
      await removeCachedNote(id)
      startTransition(() => router.refresh())
      return {}
    },
    [notes, refreshPendingCount, router]
  )

  const togglePin = useCallback(
    async (id: string, isPinned: boolean) => {
      const existing = notes.find((note) => note.id === id)
      if (!existing) {
        return { error: "Note not found." }
      }

      const note: Note = {
        ...existing,
        is_pinned: isPinned,
        updated_at: new Date().toISOString(),
      }

      if (!navigator.onLine) {
        await queueNoteUpdate(note)
        setNotes((current) => sortNotes(current.map((item) => (item.id === id ? note : item))))
        await refreshPendingCount()
        return {}
      }

      const formData = new FormData()
      formData.set("id", id)
      formData.set("isPinned", isPinned ? "true" : "false")
      const result = await toggleNotePinAction(formData)
      if (result.error) {
        return { error: result.error }
      }
      const saved = result.note ?? note
      await putCachedNote(saved)
      setNotes((current) => sortNotes(current.map((item) => (item.id === id ? saved : item))))
      startTransition(() => router.refresh())
      return {}
    },
    [notes, refreshPendingCount, router]
  )

  const value = useMemo(
    () => ({
      notes,
      isOnline,
      isSyncing,
      pendingCount,
      createNote,
      updateNote,
      deleteNote,
      togglePin,
    }),
    [notes, isOnline, isSyncing, pendingCount, createNote, updateNote, deleteNote, togglePin]
  )

  return (
    <NotesOfflineContext.Provider value={value}>{children}</NotesOfflineContext.Provider>
  )
}

export const useNotesOffline = () => {
  const context = useContext(NotesOfflineContext)
  if (!context) {
    throw new Error("useNotesOffline must be used within NotesOfflineProvider")
  }
  return context
}
