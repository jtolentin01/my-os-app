export type ChatThread = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export type ChatMessageRole = "user" | "assistant" | "tool"

export type ChatMessage = {
  id: string
  thread_id: string
  user_id: string
  role: ChatMessageRole
  content: string
  tool_name: string | null
  tool_call_id: string | null
  created_at: string
}
