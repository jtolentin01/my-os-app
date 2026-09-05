import { z } from "zod"
import {
  createNote,
  getRecentNotes,
  listNotes,
} from "@/apps/notes/services/notes"
import { sanitizeNoteHtml } from "@/apps/notes/utils/sanitize"
import { createClient } from "@/lib/supabase/server"
import type { AiToolDefinition } from "@/platform/ai/tools/types"

const createNoteToolSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().max(50000).optional().default(""),
  isPinned: z.boolean().optional().default(false),
})

const searchNotesToolSchema = z.object({
  query: z.string().trim().max(200).optional().default(""),
  limit: z.number().int().min(1).max(20).optional().default(8),
})

const getNoteToolSchema = z.object({
  id: z.string().uuid(),
})

const toNoteHtml = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ""

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return sanitizeNoteHtml(trimmed)
  }

  const escaped = trimmed
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

  return sanitizeNoteHtml(
    escaped
      .split(/\n{2,}/)
      .map((paragraph) => {
        const withBreaks = paragraph
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .join("<br>")
        return `<p>${withBreaks}</p>`
      })
      .join("")
  )
}

export const notesTools: AiToolDefinition[] = [
  {
    name: "create_note",
    tool: {
      type: "function",
      name: "create_note",
      description:
        "Create a note in the user's Notes app. Content may be plain text or simple HTML.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          isPinned: { type: "boolean" },
        },
        required: ["title", "content", "isPinned"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = createNoteToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid note payload.",
        }
      }

      const note = await createNote({
        title: parsed.data.title,
        content: toNoteHtml(parsed.data.content),
        isPinned: parsed.data.isPinned,
      })

      return {
        ok: true,
        summary: `Created note "${note.title}".`,
        data: {
          id: note.id,
          title: note.title,
          is_pinned: note.is_pinned,
        },
      }
    },
  },
  {
    name: "search_notes",
    tool: {
      type: "function",
      name: "search_notes",
      description: "Search the user's notes by title or content. Empty query lists recent notes.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query", "limit"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = searchNotesToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid search request.",
        }
      }

      const notes = parsed.data.query
        ? await listNotes(parsed.data.query)
        : await getRecentNotes(parsed.data.limit)

      const limited = notes.slice(0, parsed.data.limit).map((note) => ({
        id: note.id,
        title: note.title,
        is_pinned: note.is_pinned,
        updated_at: note.updated_at,
        preview: note.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160),
      }))

      return {
        ok: true,
        summary: `Found ${limited.length} notes.`,
        data: limited,
      }
    },
  },
  {
    name: "get_note",
    tool: {
      type: "function",
      name: "get_note",
      description: "Read one note by id.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = getNoteToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid note id.",
        }
      }

      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return { ok: false, summary: "Unauthorized" }
      }

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", parsed.data.id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (error) {
        return { ok: false, summary: error.message }
      }

      if (!data) {
        return { ok: false, summary: "Note not found." }
      }

      return {
        ok: true,
        summary: `Loaded note "${data.title}".`,
        data,
      }
    },
  },
]
