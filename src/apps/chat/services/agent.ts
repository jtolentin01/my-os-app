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
  model?: string
  webSearch?: boolean
}): Promise<SendChatMessageResult> => {
  const existing = input.threadId ? await getThread(input.threadId) : null
  const thread = existing ?? (await createThread(titleFromMessage(input.message)))

  const userMessage = await addMessage({
    threadId: thread.id,
    role: "user",
    content: input.message,
  })

  if (!existing || existing.title === "New chat") {
    await updateThreadTitle(thread.id, titleFromMessage(input.message))
  }

  const memories = await listMemories(80)
  const memoryExtraction = extractAndSaveMemoriesSafe({
    userMessage: input.message,
    existingMemories: memories,
  })

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
        userMessage: input.message,
        memoryBlock: formatMemoriesForPrompt(memories),
        model: modelId,
        webSearch: Boolean(input.webSearch),
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
