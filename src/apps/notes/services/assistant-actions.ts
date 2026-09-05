"use server"

import {
  noteAssistantRequestSchema,
  type NoteAssistantResult,
} from "@/apps/notes/schemas/assistant"
import { runNoteAssistant } from "@/apps/notes/services/assistant"

type AssistantActionResult = {
  success?: boolean
  error?: string
  result?: NoteAssistantResult
}

export const runNoteAssistantAction = async (input: {
  intent: string
  title?: string
  content?: string
  prompt?: string
}): Promise<AssistantActionResult> => {
  const parsed = noteAssistantRequestSchema.safeParse(input)

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid assistant request.",
    }
  }

  try {
    const result = await runNoteAssistant(parsed.data)
    return { success: true, result }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run the notes assistant."

    if (/api key|authentication|unauthorized|401/i.test(message)) {
      return { error: "OpenAI is not configured correctly." }
    }

    if (/insufficient.?quota|billing|credits?/i.test(message)) {
      return {
        error: "OpenAI billing or credits are not available for this API key.",
      }
    }

    if (/rate limit|429/i.test(message)) {
      return { error: "The assistant is busy. Try again in a moment." }
    }

    return { error: message }
  }
}
