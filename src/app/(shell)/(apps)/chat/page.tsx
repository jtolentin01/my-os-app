import { ChatWorkspace } from "@/apps/chat/components/chat-workspace"
import { listMessages, listThreads } from "@/apps/chat/services/chat"
import type { ChatMessage } from "@/apps/chat/types"
import { listChatModels } from "@/platform/ai/list-models"
import { pickDefaultModelId } from "@/platform/ai/models"

const ChatPage = async () => {
  const [threadsResult, models] = await Promise.all([
    listThreads().catch(() => [] as Awaited<ReturnType<typeof listThreads>>),
    listChatModels(),
  ])

  const threads = threadsResult
  const initialThreadId = threads[0]?.id ?? null
  let initialMessages: ChatMessage[] = []

  if (initialThreadId) {
    try {
      initialMessages = await listMessages(initialThreadId)
    } catch {
      initialMessages = []
    }
  }

  return (
    <ChatWorkspace
      threads={threads}
      initialThreadId={initialThreadId}
      initialMessages={initialMessages}
      models={models}
      defaultModel={pickDefaultModelId(models)}
    />
  )
}

export default ChatPage
