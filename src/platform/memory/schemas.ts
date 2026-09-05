import { z } from "zod"

export const memoryCategorySchema = z.enum([
  "identity",
  "people",
  "places",
  "work",
  "preferences",
  "beliefs",
  "other",
])

export type MemoryCategory = z.infer<typeof memoryCategorySchema>

export const saveMemorySchema = z.object({
  category: memoryCategorySchema.default("other"),
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, or underscores."),
  value: z.string().trim().min(1).max(1000),
  source: z.string().trim().max(40).optional().default("chat"),
})

export type SaveMemoryInput = z.infer<typeof saveMemorySchema>

export const deleteMemorySchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().trim().min(1).max(80).optional(),
}).refine((value) => Boolean(value.id || value.key), {
  message: "Memory id or key is required.",
})

export type DeleteMemoryInput = z.infer<typeof deleteMemorySchema>
