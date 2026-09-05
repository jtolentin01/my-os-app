import { createClient } from "@/lib/supabase/server"
import type {
  DeleteMemoryInput,
  SaveMemoryInput,
} from "@/platform/memory/schemas"
import type { UserMemory } from "@/platform/memory/types"

const getCurrentUserId = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  return user.id
}

export const listMemories = async (limit = 100): Promise<UserMemory[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("user_memories")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as UserMemory[]
}

export const saveMemory = async (input: SaveMemoryInput): Promise<UserMemory> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("user_memories")
    .upsert(
      {
        user_id: userId,
        category: input.category,
        key: input.key,
        value: input.value,
        source: input.source ?? "chat",
        updated_at: now,
      },
      { onConflict: "user_id,key" }
    )
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as UserMemory
}

export const deleteMemory = async (input: DeleteMemoryInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  let query = supabase.from("user_memories").delete().eq("user_id", userId)

  if (input.id) {
    query = query.eq("id", input.id)
  } else if (input.key) {
    query = query.eq("key", input.key)
  }

  const { error } = await query

  if (error) {
    throw new Error(error.message)
  }
}

export const formatMemoriesForPrompt = (memories: UserMemory[]) => {
  if (memories.length === 0) {
    return "No lasting personal facts saved yet."
  }

  return memories
    .map((memory) => `- [${memory.category}] ${memory.key}: ${memory.value}`)
    .join("\n")
}
