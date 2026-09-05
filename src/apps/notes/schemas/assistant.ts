import { z } from "zod"

export const noteAssistantIntentSchema = z.enum([
  "summarize",
  "improve",
  "suggest_title",
  "extract_points",
  "custom",
])

export type NoteAssistantIntent = z.infer<typeof noteAssistantIntentSchema>

export const noteAssistantRequestSchema = z.object({
  intent: noteAssistantIntentSchema,
  title: z.string().trim().max(160).optional().default(""),
  content: z.string().trim().max(50000).optional().default(""),
  prompt: z.string().trim().max(2000).optional().default(""),
})

export type NoteAssistantRequest = z.infer<typeof noteAssistantRequestSchema>

export const noteAssistantResultSchema = z.object({
  message: z.string(),
  title: z.string().nullable(),
  content: z.string().nullable(),
})

export type NoteAssistantResult = z.infer<typeof noteAssistantResultSchema>
