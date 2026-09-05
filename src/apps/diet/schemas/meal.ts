import { z } from "zod"
import { MEAL_TYPES } from "@/apps/diet/types"

export const createMealSchema = z.object({
  mealPlanId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  mealType: z.enum(MEAL_TYPES),
  title: z.string().trim().min(1, "Title is required.").max(120),
  notes: z.string().trim().max(500).optional(),
  remindAt: z.string().datetime().optional().nullable(),
  menuItemId: z.string().uuid().optional().nullable(),
  servings: z.coerce.number().min(0.25).max(20).optional().default(1),
})

export type CreateMealInput = z.infer<typeof createMealSchema>

export const updateMealSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required.").max(120),
  notes: z.string().trim().max(500).optional(),
  mealType: z.enum(MEAL_TYPES),
  remindAt: z.string().datetime().optional().nullable(),
  menuItemId: z.string().uuid().optional().nullable(),
  servings: z.coerce.number().min(0.25).max(20).optional(),
})

export type UpdateMealInput = z.infer<typeof updateMealSchema>
