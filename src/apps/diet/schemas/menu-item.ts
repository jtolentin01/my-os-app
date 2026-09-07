import { z } from "zod"
import { MENU_CATEGORIES } from "@/apps/diet/types"

const nutritionNumber = z.coerce.number().min(0).max(10000)
const recipeText = z.string().trim().max(4000).optional().nullable()

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(160),
  category: z.enum(MENU_CATEGORIES).optional().nullable(),
  servingLabel: z.string().trim().min(1).max(80).default("1 serving"),
  calories: nutritionNumber,
  carbsG: nutritionNumber,
  proteinG: nutritionNumber,
  fatG: nutritionNumber,
  notes: z.string().trim().max(500).optional().nullable(),
  ingredients: recipeText,
  instructions: recipeText,
})

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>

export const updateMenuItemSchema = createMenuItemSchema.extend({
  id: z.string().uuid(),
})

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>

export const estimateNutritionSchema = z.object({
  name: z.string().trim().min(1, "Dish name is required.").max(160),
  servingLabel: z.string().trim().max(80).optional().default("1 serving"),
  notes: z.string().trim().max(500).optional().default(""),
  includeRecipe: z.boolean().optional().default(true),
})

export type EstimateNutritionInput = z.infer<typeof estimateNutritionSchema>

export const nutritionEstimateResultSchema = z.object({
  calories: z.number(),
  carbs_g: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  serving_label: z.string().nullable(),
  note: z.string().nullable(),
  ingredients: z.array(z.string()).nullable(),
  instructions: z.array(z.string()).nullable(),
})

export type NutritionEstimateResult = z.infer<typeof nutritionEstimateResultSchema>

export const suggestMenuItemsSchema = z.object({
  count: z.coerce.number().int().min(1).max(8).optional().default(5),
  prompt: z.string().trim().max(300).optional().default(""),
})

export type SuggestMenuItemsInput = z.infer<typeof suggestMenuItemsSchema>

export const suggestMenuItemsResultSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        category: z.enum(MENU_CATEGORIES).nullable(),
        serving_label: z.string(),
        reason: z.string().nullable(),
        calories: z.number(),
        carbs_g: z.number(),
        protein_g: z.number(),
        fat_g: z.number(),
      })
    )
    .min(1)
    .max(8),
})

export type SuggestMenuItemsResult = z.infer<typeof suggestMenuItemsResultSchema>
