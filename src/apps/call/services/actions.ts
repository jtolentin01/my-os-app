"use server"

import { z } from "zod"
import { executeTool } from "@/platform/ai/tools/registry"

const executeCallToolSchema = z.object({
  name: z.string().trim().min(1).max(100),
  argumentsJson: z.string().max(20_000),
})

export const executeCallToolAction = async (input: {
  name: string
  argumentsJson: string
}) => {
  const parsed = executeCallToolSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false as const,
      summary: parsed.error.issues[0]?.message ?? "Invalid tool request.",
    }
  }

  let args: Record<string, unknown> = {}
  try {
    const raw = JSON.parse(parsed.data.argumentsJson) as unknown
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      args = raw as Record<string, unknown>
    }
  } catch {
    return {
      ok: false as const,
      summary: "Tool arguments were invalid.",
    }
  }

  try {
    const result = await executeTool(parsed.data.name, args, {
      allowSaveMemory: true,
    })
    return {
      ok: result.ok,
      summary: result.summary,
      data: result.data,
    }
  } catch (error) {
    return {
      ok: false as const,
      summary: error instanceof Error ? error.message : "Tool failed.",
    }
  }
}
