import type { AiToolDefinition } from "@/platform/ai/tools/types"
import { resolveMemoryValue } from "@/platform/memory/merge"
import {
  deleteMemorySchema,
  saveMemorySchema,
} from "@/platform/memory/schemas"
import {
  deleteMemory,
  listMemories,
  saveMemory,
} from "@/platform/memory/services"

export const memoryTools: AiToolDefinition[] = [
  {
    name: "save_memory",
    tool: {
      type: "function",
      name: "save_memory",
      description:
        "Save or update a lasting personal fact about the user (job, city, family, preferences, habits). Use a short snake_case key. List-style keys like favorite_artist append instead of replacing.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["identity", "people", "places", "work", "preferences", "beliefs", "other"],
          },
          key: {
            type: "string",
            description: "Short snake_case key, e.g. job, city, favorite_artist",
          },
          value: {
            type: "string",
            description: "The fact to remember",
          },
        },
        required: ["category", "key", "value"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = saveMemorySchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid memory payload.",
        }
      }

      const existing = await listMemories(100)
      const previous = existing.find((memory) => memory.key === parsed.data.key)?.value
      const value = resolveMemoryValue(parsed.data.key, parsed.data.value, previous)

      const memory = await saveMemory({
        ...parsed.data,
        value,
      })
      return {
        ok: true,
        summary: `Saved memory ${memory.key}.`,
        data: memory,
      }
    },
  },
  {
    name: "list_memories",
    tool: {
      type: "function",
      name: "list_memories",
      description: "List saved personal facts about the user.",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    execute: async () => {
      const memories = await listMemories(100)
      return {
        ok: true,
        summary: `Found ${memories.length} memories.`,
        data: memories.map((memory) => ({
          id: memory.id,
          category: memory.category,
          key: memory.key,
          value: memory.value,
        })),
      }
    },
  },
  {
    name: "delete_memory",
    tool: {
      type: "function",
      name: "delete_memory",
      description: "Delete a saved personal fact by id or key.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          id: { type: ["string", "null"] },
          key: { type: ["string", "null"] },
        },
        required: ["id", "key"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = deleteMemorySchema.safeParse({
        id: args.id ?? undefined,
        key: args.key ?? undefined,
      })
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid delete request.",
        }
      }

      await deleteMemory(parsed.data)
      return {
        ok: true,
        summary: "Memory deleted.",
      }
    },
  },
]
