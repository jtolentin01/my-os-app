import { IMAGE_ONLY_USER_MESSAGE } from "@/apps/chat/utils/image-attachment"
import {
  addMessage,
  createThread,
  getThread,
  listMessages,
  touchThread,
  updateThreadTitle,
} from "@/apps/chat/services/chat"
import type { ChatMessage, ChatThread } from "@/apps/chat/types"
import { runAgentTurn } from "@/platform/ai/agent"
import { resolveChatModel } from "@/platform/ai/list-models"
import { extractAndSaveMemoriesSafe } from "@/platform/memory/extract"
import {
  formatMemoriesForPrompt,
  listMemories,
} from "@/platform/memory/services"
import type { UserMemory } from "@/platform/memory/types"

const HISTORY_LIMIT = 24

const titleFromMessage = (message: string) => {
  const cleaned = message.replace(/\s+/g, " ").trim()
  if (cleaned.length <= 60) return cleaned || "New chat"
  return `${cleaned.slice(0, 57).trimEnd()}...`
}

const resolveUserContent = (message: string, hasImage: boolean) => {
  const trimmed = message.trim()
  if (trimmed) return trimmed
  if (hasImage) return IMAGE_ONLY_USER_MESSAGE
  return ""
}

export type SendChatMessageResult =
  | {
      ok: true
      thread: ChatThread
      userMessage: ChatMessage
      assistantMessage: ChatMessage
      toolSummaries: string[]
      savedMemories: UserMemory[]
    }
  | {
      ok: false
      error: string
      thread: ChatThread
      userMessage: ChatMessage
      savedMemories: UserMemory[]
    }

export const sendChatMessage = async (input: {
  threadId?: string
  message: string
  imageDataUrl?: string
  model?: string
  webSearch?: boolean
  saveMemory?: boolean
}): Promise<SendChatMessageResult> => {
  const imageDataUrl = input.imageDataUrl?.trim() || undefined
  const saveMemory = input.saveMemory !== false
  const content = resolveUserContent(input.message, Boolean(imageDataUrl))
  const existing = input.threadId ? await getThread(input.threadId) : null
  const thread = existing ?? (await createThread(titleFromMessage(content)))

  const userMessage = await addMessage({
    threadId: thread.id,
    role: "user",
    content,
  })

  if (!existing || existing.title === "New chat") {
    await updateThreadTitle(thread.id, titleFromMessage(content))
  }

  const memories = await listMemories(80)
  const memoryExtraction = saveMemory
    ? extractAndSaveMemoriesSafe({
        userMessage: content,
        existingMemories: memories,
      })
    : Promise.resolve([] as UserMemory[])

  try {
    const [{ modelId }, history] = await Promise.all([
      resolveChatModel(input.model),
      listMessages(thread.id),
    ])

    const agentHistory = history
      .filter((message) => message.role === "user" || message.role === "assistant")
      .filter((message) => message.id !== userMessage.id)
      .slice(-HISTORY_LIMIT)
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }))

    const [result, savedMemories] = await Promise.all([
      runAgentTurn({
        history: agentHistory,
        userMessage: content,
        imageDataUrl,
        memoryBlock: formatMemoriesForPrompt(memories),
        model: modelId,
        webSearch: Boolean(input.webSearch),
        saveMemory,
      }),
      memoryExtraction,
    ])

    for (const event of result.toolEvents) {
      await addMessage({
        threadId: thread.id,
        role: "tool",
        content: event.summary,
        toolName: event.name,
      })
    }

    if (savedMemories.length > 0) {
      await addMessage({
        threadId: thread.id,
        role: "tool",
        content: savedMemories
          .map((memory) => `Remembered ${memory.key}: ${memory.value}`)
          .join("; "),
        toolName: "memory_extract",
      })
    }

    const assistantMessage = await addMessage({
      threadId: thread.id,
      role: "assistant",
      content: result.message,
    })

    await touchThread(thread.id)
    const refreshed = (await getThread(thread.id)) ?? thread

    return {
      ok: true,
      thread: refreshed,
      userMessage,
      assistantMessage,
      toolSummaries: result.toolEvents.map((event) => event.summary),
      savedMemories,
    }
  } catch (error) {
    const savedMemories = await memoryExtraction
    await touchThread(thread.id)
    const refreshed = (await getThread(thread.id)) ?? thread
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send chat message.",
      thread: refreshed,
      userMessage,
      savedMemories,
    }
  }
}
