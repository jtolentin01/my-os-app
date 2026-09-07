import type { RealtimeFunctionTool } from "openai/resources/realtime/realtime"
import { getToolDefinitions } from "@/platform/ai/tools/registry"

export const getRealtimeToolDefinitions = (options?: {
  allowSaveMemory?: boolean
}): RealtimeFunctionTool[] =>
  getToolDefinitions(options).map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description ?? undefined,
    parameters: tool.parameters ?? undefined,
  }))
