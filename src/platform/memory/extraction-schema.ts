import { z } from "zod"
import { memoryCategorySchema } from "@/platform/memory/schemas"

export const extractedMemorySchema = z.object({
  category: memoryCategorySchema,
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_]+$/),
  value: z.string().trim().min(1).max(1000),
})

export type ExtractedMemory = z.infer<typeof extractedMemorySchema>

export const memoryExtractionResultSchema = z.object({
  memories: z.array(extractedMemorySchema).max(12),
})

export type MemoryExtractionResult = z.infer<typeof memoryExtractionResultSchema>
