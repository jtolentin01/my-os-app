import { zodTextFormat } from "openai/helpers/zod"
import {
  suggestMenuItemsResultSchema,
  type SuggestMenuItemsInput,
  type SuggestMenuItemsResult,
} from "@/apps/diet/schemas/menu-item"
import { listMenuItems } from "@/apps/diet/services/menu-items"
import { roundNutrition } from "@/apps/diet/utils/nutrition"
import {
  formatMemoriesForPrompt,
  listMemories,
} from "@/platform/memory/services"
import { getOpenAIClient, getOpenAIModel } from "@/platform/ai/client"
import { createClient } from "@/lib/supabase/server"

const SYSTEM_PROMPT = [
  "You suggest practical cookable dishes for a personal diet menu.",
  "Return structured JSON only.",
  "Prefer everyday homemade meals the user can cook and reuse in a weekly planner.",
  "Avoid duplicates of dishes already on their menu.",
  "Use the user's personal facts when helpful (likes, dislikes, city, habits).",
  "category must be one of: viand, rice, soup, snack, drink, other — or null.",
  "serving_label should be a short portion description.",
  "reason is one short sentence why this fits, or null.",
  "Include realistic estimated nutrition for one serving: calories (kcal), carbs_g, protein_g, fat_g.",
].join(" ")

export const suggestMenuItems = async (
  input: SuggestMenuItemsInput
): Promise<SuggestMenuItemsResult> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("You must be signed in to suggest dishes.")
  }

  const existing = await listMenuItems()
  const existingNames = existing.map((item) => item.name).slice(0, 40)

  let memoryBlock = "No lasting personal facts saved yet."
  try {
    const memories = await listMemories(40)
    memoryBlock = formatMemoriesForPrompt(memories)
  } catch {}

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
          `Suggest ${input.count} new menu dishes.`,
          `User request: ${input.prompt.trim() || "(none — suggest a balanced everyday mix)"}`,
          `Already on menu (do not repeat): ${
            existingNames.length > 0 ? existingNames.join(", ") : "(empty)"
          }`,
          "Known personal facts:",
          memoryBlock,
        ].join("\n"),
      },
    ],
    text: {
      format: zodTextFormat(
        suggestMenuItemsResultSchema,
        "suggest_menu_items_result"
      ),
    },
  })

  const parsed = response.output_parsed
  if (!parsed?.items?.length) {
    throw new Error("The assistant returned no dish suggestions.")
  }

  const existingLower = new Set(existingNames.map((name) => name.toLowerCase()))
  const items = parsed.items
    .map((item) => ({
      name: item.name.trim(),
      category: item.category,
      serving_label: item.serving_label.trim() || "1 serving",
      reason: item.reason?.trim() || null,
      calories: roundNutrition(item.calories),
      carbs_g: roundNutrition(item.carbs_g),
      protein_g: roundNutrition(item.protein_g),
      fat_g: roundNutrition(item.fat_g),
    }))
    .filter(
      (item) =>
        item.name.length > 0 && !existingLower.has(item.name.toLowerCase())
    )
    .slice(0, input.count)

  if (items.length === 0) {
    throw new Error("No new dish suggestions were available.")
  }

  return { items }
}
