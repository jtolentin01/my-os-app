import { zodTextFormat } from "openai/helpers/zod"
import {
  nutritionEstimateResultSchema,
  type EstimateNutritionInput,
  type NutritionEstimateResult,
} from "@/apps/diet/schemas/menu-item"
import { roundNutrition } from "@/apps/diet/utils/nutrition"
import { getOpenAIClient, getOpenAIModel } from "@/platform/ai/client"
import { createClient } from "@/lib/supabase/server"

const SYSTEM_PROMPT = [
  "You estimate nutrition facts for a single serving of a dish.",
  "Return structured JSON only.",
  "Use realistic everyday cooking estimates, not lab precision.",
  "calories is kcal for one serving.",
  "carbs_g, protein_g, and fat_g are grams for one serving.",
  "serving_label may refine the serving description, or null to keep the user's label.",
  "note is a short plain-text caveat, or null.",
  "Do not invent branded products. Prefer common homemade or canteen-style portions.",
  "If the dish is vague, assume a typical adult plate/serving and say so in note.",
].join(" ")

export const estimateMenuNutrition = async (
  input: EstimateNutritionInput
): Promise<NutritionEstimateResult> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("You must be signed in to estimate nutrition.")
  }

  const client = getOpenAIClient()
  const model = getOpenAIModel()

  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          `Dish name: ${input.name}`,
          `Serving: ${input.servingLabel || "1 serving"}`,
          `Notes: ${input.notes.trim() || "(none)"}`,
        ].join("\n"),
      },
    ],
    text: {
      format: zodTextFormat(
        nutritionEstimateResultSchema,
        "nutrition_estimate_result"
      ),
    },
  })

  const parsed = response.output_parsed
  if (!parsed) {
    throw new Error("The assistant returned an empty nutrition estimate.")
  }

  return {
    calories: roundNutrition(parsed.calories),
    carbs_g: roundNutrition(parsed.carbs_g),
    protein_g: roundNutrition(parsed.protein_g),
    fat_g: roundNutrition(parsed.fat_g),
    serving_label: parsed.serving_label?.trim() || null,
    note: parsed.note?.trim() || null,
  }
}
