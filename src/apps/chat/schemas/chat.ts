import { z } from "zod"

export const sendChatMessageSchema = z.object({
  threadId: z.string().uuid().optional(),
  message: z.string().trim().min(1, "Message is required.").max(8000),
  model: z.string().trim().min(1).max(120).optional(),
  webSearch: z.boolean().optional(),
})

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>
