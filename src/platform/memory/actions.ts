"use server"

import { revalidatePath } from "next/cache"
import {
  deleteMemorySchema,
  saveMemorySchema,
} from "@/platform/memory/schemas"
import {
  deleteMemory,
  listMemories,
  saveMemory,
} from "@/platform/memory/services"
import type { UserMemory } from "@/platform/memory/types"

const revalidateMemoryPaths = () => {
  revalidatePath("/settings")
  revalidatePath("/chat")
}

export const listMemoriesAction = async () => {
  try {
    const memories = await listMemories()
    return { success: true as const, memories }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load memories.",
      memories: [] as UserMemory[],
    }
  }
}

export const saveMemoryAction = async (input: {
  category?: string
  key: string
  value: string
}): Promise<{ success?: boolean; error?: string; memory?: UserMemory }> => {
  const parsed = saveMemorySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid memory." }
  }

  try {
    const memory = await saveMemory(parsed.data)
    revalidateMemoryPaths()
    return { success: true, memory }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save memory.",
    }
  }
}

export const deleteMemoryAction = async (input: {
  id?: string
  key?: string
}): Promise<{ success?: boolean; error?: string }> => {
  const parsed = deleteMemorySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid delete request." }
  }

  try {
    await deleteMemory(parsed.data)
    revalidateMemoryPaths()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete memory.",
    }
  }
}
