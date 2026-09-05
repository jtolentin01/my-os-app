import type { FunctionTool } from "openai/resources/responses/responses"

export type AiToolResult = {
  ok: boolean
  summary: string
  data?: unknown
}

export type AiToolDefinition = {
  name: string
  tool: FunctionTool
  execute: (args: Record<string, unknown>) => Promise<AiToolResult>
}
