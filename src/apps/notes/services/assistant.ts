import { zodTextFormat } from "openai/helpers/zod"
import {
  noteAssistantResultSchema,
  type NoteAssistantRequest,
  type NoteAssistantResult,
} from "@/apps/notes/schemas/assistant"
import { sanitizeNoteHtml } from "@/apps/notes/utils/sanitize"
import { getOpenAIClient, getOpenAIModel } from "@/platform/ai/client"
import { createClient } from "@/lib/supabase/server"

const intentInstructions: Record<NoteAssistantRequest["intent"], string> = {
  summarize:
    "Summarize the note clearly and briefly. Put the summary HTML in content. Leave title null.",
  improve:
    "Improve clarity, grammar, and structure while preserving meaning. Put the rewritten note HTML in content. Leave title null unless the current title is empty or clearly wrong.",
  suggest_title:
    "Suggest a concise, useful title (max 160 characters). Put it in title. Leave content null.",
  extract_points:
    "Extract the key points and action items as an HTML bullet list in content. Leave title null.",
  custom:
    "Follow the user's request. If they ask to create, rewrite, reformat, shorten, expand, remove bullets or lists, convert to paragraphs, create or edit a table, or otherwise edit the note, return the full updated note HTML in content. Only leave content null for questions that do not need an editor update.",
}

const buildSystemPrompt = (intent: NoteAssistantRequest["intent"]) =>
  [
    "You are My OS Notes Assistant.",
    "Help the user with their personal note.",
    "You are part of My OS only. If asked what model you are or whether you are ChatGPT/OpenAI/etc., say you are their My OS assistant and continue helping with the note.",
    "Only use the note content and user request provided for this user. Do not invent other users' data.",
    "Return structured JSON only.",
    "message: a short plain-text reply shown in the assistant panel.",
    "title: suggested note title, or null if unchanged.",
    "content: suggested note body as simple HTML using only p, br, strong, em, u, s, ul, ol, li, blockquote, a, table, thead, tbody, tr, th, td. No markdown. Null if unchanged.",
    "The current note is provided as HTML. Preserve meaning unless the user asks to change it.",
    "You can change formatting. When asked to remove bullets, remove numbered lists, or rewrite as plain paragraphs, return updated HTML using p/br only (no ul/ol/li) in content.",
    "When asked for a table, comparison, schedule, or structured columns/rows, return a real HTML table using table/thead/tbody/tr/th/td with a header row when useful. Put cell text inside th/td as plain text or wrapped in p tags. Do not use markdown tables.",
    "Never say you cannot modify formatting or the note. If an edit was requested, put the full updated note in content.",
    "Do not invent facts that are not in the note, unless the user asked you to generate new placeholder or sample content.",
    "Do not wipe the note unless the user asked to clear or replace it.",
    intentInstructions[intent],
  ].join(" ")

const escapePlainText = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const normalizeAssistantContent = (value: string | null) => {
  if (value == null) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    const sanitized = sanitizeNoteHtml(trimmed)
    return sanitized || null
  }

  const html = trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const withBreaks = paragraph
        .split("\n")
        .map((line) => escapePlainText(line.trim()))
        .filter(Boolean)
        .join("<br>")
      return `<p>${withBreaks}</p>`
    })
    .join("")

  const sanitized = sanitizeNoteHtml(html)
  return sanitized || null
}

const normalizeAssistantTitle = (value: string | null) => {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 160)
}

export const runNoteAssistant = async (
  input: NoteAssistantRequest
): Promise<NoteAssistantResult> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("You must be signed in to use the notes assistant.")
  }

  const noteHtml = sanitizeNoteHtml(input.content)
  const hasNote = Boolean(input.title.trim() || noteHtml)

  if (!hasNote && input.intent !== "custom") {
    throw new Error("Add a title or some note content first.")
  }

  if (input.intent === "custom" && !input.prompt.trim()) {
    throw new Error("Enter a request for the assistant.")
  }

  if (input.intent === "custom" && !hasNote && input.prompt.trim().length < 3) {
    throw new Error("Add note content or a clearer request.")
  }

  const client = getOpenAIClient()
  const model = getOpenAIModel()

  const userParts = [
    `Intent: ${input.intent}`,
    `Current title: ${input.title.trim() || "(empty)"}`,
    `Current content (HTML): ${noteHtml || "(empty)"}`,
  ]

  if (input.prompt.trim()) {
    userParts.push(`User request: ${input.prompt.trim()}`)
  }

  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content: buildSystemPrompt(input.intent),
      },
      {
        role: "user",
        content: userParts.join("\n"),
      },
    ],
    text: {
      format: zodTextFormat(noteAssistantResultSchema, "note_assistant_result"),
    },
  })

  const parsed = response.output_parsed

  if (!parsed) {
    throw new Error("The assistant returned an empty response.")
  }

  return {
    message: parsed.message.trim() || "Done.",
    title: normalizeAssistantTitle(parsed.title),
    content: normalizeAssistantContent(parsed.content),
  }
}
