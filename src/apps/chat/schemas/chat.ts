import { z } from "zod"
import {
  CHAT_IMAGE_MAX_BYTES,
  isChatImageDataUrl,
} from "@/apps/chat/utils/image-attachment"

const chatImageDataUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(Math.ceil(CHAT_IMAGE_MAX_BYTES * (4 / 3)) + 64)
  .refine(isChatImageDataUrl, "Image must be a JPG, PNG, or WebP up to 2MB.")

export const sendChatMessageSchema = z
  .object({
    threadId: z.string().uuid().optional(),
    message: z.string().trim().max(8000).default(""),
    model: z.string().trim().min(1).max(120).optional(),
    webSearch: z.boolean().optional(),
    saveMemory: z.boolean().optional(),
    imageDataUrl: chatImageDataUrlSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.message && !data.imageDataUrl) {
      ctx.addIssue({
        code: "custom",
        message: "Message is required.",
        path: ["message"],
      })
    }
  })

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>
