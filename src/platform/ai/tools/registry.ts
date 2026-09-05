import { dietTools } from "@/platform/ai/tools/diet"
import { memoryTools } from "@/platform/ai/tools/memory"
import { notesTools } from "@/platform/ai/tools/notes"
import type { AiToolDefinition } from "@/platform/ai/tools/types"

const toolsByName = new Map<string, AiToolDefinition>(
  [...memoryTools, ...notesTools, ...dietTools].map((tool) => [tool.name, tool])
)

export const getRegisteredTools = () => Array.from(toolsByName.values())

export const getToolDefinitions = (options?: { allowSaveMemory?: boolean }) => {
  const allowSaveMemory = options?.allowSaveMemory !== false
  return getRegisteredTools()
    .filter((entry) => allowSaveMemory || entry.name !== "save_memory")
    .map((entry) => entry.tool)
}

export const executeTool = async (
  name: string,
  args: Record<string, unknown>,
  options?: { allowSaveMemory?: boolean }
) => {
  if (options?.allowSaveMemory === false && name === "save_memory") {
    return {
      ok: false,
      summary: "Saving memory is turned off for this turn.",
    }
  }

  const tool = toolsByName.get(name)
  if (!tool) {
    return {
      ok: false,
      summary: `Unknown tool: ${name}`,
    }
  }

  try {
    return await tool.execute(args)
  } catch (error) {
    return {
      ok: false,
      summary: error instanceof Error ? error.message : "Tool failed.",
    }
  }
}
