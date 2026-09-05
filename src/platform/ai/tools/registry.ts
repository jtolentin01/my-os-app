import { memoryTools } from "@/platform/ai/tools/memory"
import { notesTools } from "@/platform/ai/tools/notes"
import type { AiToolDefinition } from "@/platform/ai/tools/types"

const toolsByName = new Map<string, AiToolDefinition>(
  [...memoryTools, ...notesTools].map((tool) => [tool.name, tool])
)

export const getRegisteredTools = () => Array.from(toolsByName.values())

export const getToolDefinitions = () =>
  getRegisteredTools().map((entry) => entry.tool)

export const executeTool = async (
  name: string,
  args: Record<string, unknown>
) => {
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
