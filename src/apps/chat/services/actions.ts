"use server"

import { revalidatePath } from "next/cache"
import { sendChatMessageSchema } from "@/apps/chat/schemas/chat"
import {
  createThread,
  deleteThread,
  listMessages,
  listThreads,
} from "@/apps/chat/services/chat"
import { sendChatMessage } from "@/apps/chat/services/agent"
import type { ChatMessage, ChatThread } from "@/apps/chat/types"
import type { UserMemory } from "@/platform/memory/types"

const revalidateChat = () => {
  revalidatePath("/chat")
  revalidatePath("/notes")
  revalidatePath("/settings")
  revalidatePath("/dashboard")
}

type SendResult = {
  success?: boolean
  error?: string
  thread?: ChatThread
  userMessage?: ChatMessage
  assistantMessage?: ChatMessage
  toolSummaries?: string[]
  savedMemories?: UserMemory[]
}

const mapAiError = (message: string) => {
  if (/api key|authentication|unauthorized|401/i.test(message)) {
    return "OpenAI is not configured correctly."
  }
  if (/insufficient.?quota|billing|credits?/i.test(message)) {
    return "OpenAI billing or credits are not available for this API key."
  }
  if (/web[_ ]?search/i.test(message)) {
    return "Web search is not available for this model or API key."
  }
  if (/rate limit|429/i.test(message)) {
    return "The assistant is busy. Try again in a moment."
  }
  return message
}

export const sendChatMessageAction = async (input: {
  threadId?: string
  message: string
  model?: string
  webSearch?: boolean
}): Promise<SendResult> => {
  const parsed = sendChatMessageSchema.safeParse(input)

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid chat message.",
    }
  }

  try {
    const result = await sendChatMessage(parsed.data)

    if (!result.ok) {
      revalidateChat()
      return {
        error: mapAiError(result.error),
        thread: result.thread,
        userMessage: result.userMessage,
        savedMemories: result.savedMemories,
      }
    }

    revalidateChat()
    return {
      success: true,
      thread: result.thread,
      userMessage: result.userMessage,
      assistantMessage: result.assistantMessage,
      toolSummaries: result.toolSummaries,
      savedMemories: result.savedMemories,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send chat message."
    return { error: mapAiError(message) }
  }
}

export const createChatThreadAction = async (): Promise<{
  success?: boolean
  error?: string
  thread?: ChatThread
}> => {
  try {
    const thread = await createThread()
    revalidatePath("/chat")
    return { success: true, thread }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create chat.",
    }
  }
}

export const deleteChatThreadAction = async (
  threadId: string
): Promise<{ success?: boolean; error?: string }> => {
  if (!threadId) {
    return { error: "Chat id is required." }
  }

  try {
    await deleteThread(threadId)
    revalidatePath("/chat")
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete chat.",
    }
  }
}

export const listChatMessagesAction = async (threadId: string) => {
  try {
    const messages = await listMessages(threadId)
    return { success: true as const, messages }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load messages.",
      messages: [] as ChatMessage[],
    }
  }
}

export const listChatThreadsAction = async () => {
  try {
    const threads = await listThreads()
    return { success: true as const, threads }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load chats.",
      threads: [] as ChatThread[],
    }
  }
}
