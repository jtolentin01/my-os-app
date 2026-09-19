import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId } from "@/lib/supabase/auth"
import type { ChatMessage, ChatThread } from "@/apps/chat/types"
import {
  PAGE_SIZE,
  buildPageResult,
  getPageRange,
  type PageResult,
} from "@/lib/pagination"

export const listThreads = async (): Promise<ChatThread[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("chat_threads")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as ChatThread[]
}

export const listThreadsPage = async (input?: {
  page?: number
  pageSize?: number
}): Promise<PageResult<ChatThread>> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const pageSize = input?.pageSize ?? PAGE_SIZE
  const { from, to, page } = getPageRange(input?.page ?? 1, pageSize)

  const { data, error, count } = await supabase
    .from("chat_threads")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(error.message)
  }

  return buildPageResult(
    (data ?? []) as ChatThread[],
    count ?? 0,
    page,
    pageSize
  )
}

export const getThread = async (threadId: string): Promise<ChatThread | null> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as ChatThread | null) ?? null
}

export const createThread = async (title = "New chat"): Promise<ChatThread> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      user_id: userId,
      title: title.slice(0, 120),
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as ChatThread
}

export const updateThreadTitle = async (threadId: string, title: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from("chat_threads")
    .update({
      title: title.slice(0, 120),
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export const touchThread = async (threadId: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export const deleteThread = async (threadId: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from("chat_threads")
    .delete()
    .eq("id", threadId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export const listMessages = async (threadId: string): Promise<ChatMessage[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const thread = await getThread(threadId)
  if (!thread) {
    throw new Error("Chat not found.")
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as ChatMessage[]
}

export const addMessage = async (input: {
  threadId: string
  role: ChatMessage["role"]
  content: string
  toolName?: string | null
  toolCallId?: string | null
}): Promise<ChatMessage> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: input.threadId,
      user_id: userId,
      role: input.role,
      content: input.content,
      tool_name: input.toolName ?? null,
      tool_call_id: input.toolCallId ?? null,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as ChatMessage
}
