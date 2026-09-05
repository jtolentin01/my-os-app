import { z } from "zod"
import { MENU_CATEGORIES } from "@/apps/diet/types"

const nutritionNumber = z.coerce.number().min(0).max(10000)

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(160),
  category: z.enum(MENU_CATEGORIES).optional().nullable(),
  servingLabel: z.string().trim().min(1).max(80).default("1 serving"),
  calories: nutritionNumber,
  carbsG: nutritionNumber,
  proteinG: nutritionNumber,
  fatG: nutritionNumber,
  notes: z.string().trim().max(500).optional().nullable(),
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
})

export type EstimateNutritionInput = z.infer<typeof estimateNutritionSchema>

export const nutritionEstimateResultSchema = z.object({
  calories: z.number(),
  carbs_g: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  serving_label: z.string().nullable(),
  note: z.string().nullable(),
})

export type NutritionEstimateResult = z.infer<typeof nutritionEstimateResultSchema>
