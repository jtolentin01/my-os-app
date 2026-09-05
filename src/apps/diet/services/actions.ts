"use server"

import { revalidatePath } from "next/cache"
import {
  createMeal,
  deleteMeal,
  updateMeal,
} from "@/apps/diet/services/meals"
import {
  createMealSchema,
  updateMealSchema,
} from "@/apps/diet/schemas/meal"

export const createMealAction = async (formData: FormData) => {
  const remindAtRaw = formData.get("remindAt")
  const parsed = createMealSchema.safeParse({
    mealPlanId: formData.get("mealPlanId"),
    dayOfWeek: formData.get("dayOfWeek"),
    mealType: formData.get("mealType"),
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    remindAt:
      typeof remindAtRaw === "string" && remindAtRaw.length > 0
        ? remindAtRaw
        : null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid meal data." }
  }

  try {
    await createMeal(parsed.data)
    revalidatePath("/diet")
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create meal.",
    }
  }
}

export const updateMealAction = async (formData: FormData) => {
  const remindAtRaw = formData.get("remindAt")
  const parsed = updateMealSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    mealType: formData.get("mealType"),
    notes: formData.get("notes") || undefined,
    remindAt:
      typeof remindAtRaw === "string" && remindAtRaw.length > 0
        ? remindAtRaw
        : null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid meal data." }
  }

  try {
    await updateMeal(parsed.data)
    revalidatePath("/diet")
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update meal.",
    }
  }
}

export const deleteMealAction = async (formData: FormData) => {
  const id = String(formData.get("id") ?? "")

  if (!id) {
    return { error: "Meal id is required." }
  }

  try {
    await deleteMeal(id)
    revalidatePath("/diet")
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete meal.",
    }
  }
}
