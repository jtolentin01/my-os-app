"use server"

import { revalidatePath } from "next/cache"
import {
  estimateNutritionSchema,
  suggestMenuItemsSchema,
  type NutritionEstimateResult,
  type SuggestMenuItemsResult,
} from "@/apps/diet/schemas/menu-item"
import { createMenuItem } from "@/apps/diet/services/menu-items"
import { estimateMenuNutrition } from "@/apps/diet/services/nutrition-estimate"
import { suggestMenuItems } from "@/apps/diet/services/suggest-menu-items"
import { textFromLines } from "@/apps/diet/utils/recipe"

type EstimateActionResult = {
  success?: boolean
  error?: string
  result?: NutritionEstimateResult
}

const mapAiError = (message: string) => {
  if (/api key|authentication|unauthorized|401|not configured/i.test(message)) {
    return "OpenAI is not configured correctly."
  }
  if (/insufficient.?quota|billing|credits?/i.test(message)) {
    return "OpenAI billing or credits are not available for this API key."
  }
  if (/rate limit|429/i.test(message)) {
    return "The assistant is busy. Try again in a moment."
  }
  return message
}

export const estimateMenuNutritionAction = async (input: {
  name: string
  servingLabel?: string
  notes?: string
  includeRecipe?: boolean
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
    return {
      error: mapAiError(
        error instanceof Error ? error.message : "Failed to estimate nutrition."
      ),
    }
  }
}

type SuggestActionResult = {
  success?: boolean
  error?: string
  result?: SuggestMenuItemsResult
}

export const suggestMenuItemsAction = async (input: {
  count?: number
  prompt?: string
}): Promise<SuggestActionResult> => {
  const parsed = suggestMenuItemsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid suggestion request.",
    }
  }

  try {
    const result = await suggestMenuItems(parsed.data)
    return { success: true, result }
  } catch (error) {
    return {
      error: mapAiError(
        error instanceof Error ? error.message : "Failed to suggest dishes."
      ),
    }
  }
}

type AcceptSuggestion = {
  name: string
  category?: string | null
  servingLabel?: string
}

export const acceptMenuSuggestionsAction = async (input: {
  items: AcceptSuggestion[]
}) => {
  const items = input.items
    .map((item) => ({
      name: item.name.trim(),
      category: item.category ?? null,
      servingLabel: item.servingLabel?.trim() || "1 serving",
    }))
    .filter((item) => item.name.length > 0)
    .slice(0, 8)

  if (items.length === 0) {
    return { error: "Select at least one dish to add." }
  }

  try {
    let created = 0
    for (const item of items) {
      let calories = 0
      let carbsG = 0
      let proteinG = 0
      let fatG = 0
      let servingLabel = item.servingLabel
      let ingredients: string | null = null
      let instructions: string | null = null

      try {
        const estimated = await estimateMenuNutrition({
          name: item.name,
          servingLabel,
          notes: "",
          includeRecipe: true,
        })
        calories = estimated.calories
        carbsG = estimated.carbs_g
        proteinG = estimated.protein_g
        fatG = estimated.fat_g
        if (estimated.serving_label?.trim()) {
          servingLabel = estimated.serving_label.trim()
        }
        ingredients = estimated.ingredients
          ? textFromLines(estimated.ingredients)
          : null
        instructions = estimated.instructions
          ? textFromLines(estimated.instructions)
          : null
      } catch {}

      await createMenuItem({
        name: item.name,
        category: item.category,
        servingLabel,
        calories,
        carbsG,
        proteinG,
        fatG,
        notes: null,
        ingredients,
        instructions,
      })
      created += 1
    }

    revalidatePath("/diet")
    revalidatePath("/dashboard")
    return { success: true, created }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to add suggested dishes.",
    }
  }
}
