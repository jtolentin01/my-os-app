import { z } from "zod"

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  content: z.string().trim().max(50000).optional(),
  isPinned: z.coerce.boolean().optional(),
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>

export const updateNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(160),
  content: z.string().trim().max(50000).optional(),
  isPinned: z.coerce.boolean().optional(),
})

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
