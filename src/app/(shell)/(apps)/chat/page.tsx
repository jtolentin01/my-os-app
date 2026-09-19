import { ChatWorkspace } from "@/apps/chat/components/chat-workspace"
import { listMessages, listThreadsPage } from "@/apps/chat/services/chat"
import type { ChatMessage, ChatThread } from "@/apps/chat/types"
import { listChatModels } from "@/platform/ai/list-models"
import { pickDefaultModelId } from "@/platform/ai/models"

const ChatPage = async () => {
  const [threadsResult, models] = await Promise.all([
    listThreadsPage({ page: 1 }).catch(() => ({
      items: [] as ChatThread[],
      total: 0,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    })),
    listChatModels(),
  ])

  const threads = threadsResult.items
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
      threadsPage={threadsResult.page}
      threadsTotalPages={threadsResult.totalPages}
      initialThreadId={initialThreadId}
      initialMessages={initialMessages}
      models={models}
      defaultModel={pickDefaultModelId(models)}
    />
  )
}

export default ChatPage
