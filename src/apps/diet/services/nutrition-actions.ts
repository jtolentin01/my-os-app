"use server"

import {
  estimateNutritionSchema,
  type NutritionEstimateResult,
} from "@/apps/diet/schemas/menu-item"
import { estimateMenuNutrition } from "@/apps/diet/services/nutrition-estimate"

type EstimateActionResult = {
  success?: boolean
  error?: string
  result?: NutritionEstimateResult
}

export const estimateMenuNutritionAction = async (input: {
  name: string
  servingLabel?: string
  notes?: string
}): Promise<EstimateActionResult> => {
  const parsed = estimateNutritionSchema.safeParse(input)

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid nutrition request.",
    }
  }

  try {
    const result = await estimateMenuNutrition(parsed.data)
    return { success: true, result }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to estimate nutrition."

    if (/api key|authentication|unauthorized|401|not configured/i.test(message)) {
      return { error: "OpenAI is not configured correctly." }
    }

    if (/insufficient.?quota|billing|credits?/i.test(message)) {
      return {
        error: "OpenAI billing or credits are not available for this API key.",
      }
    }

    if (/rate limit|429/i.test(message)) {
      return { error: "The assistant is busy. Try again in a moment." }
    }

    return { error: message }
  }
}
