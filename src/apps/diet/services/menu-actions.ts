"use server"

import { revalidatePath } from "next/cache"
import {
  createMenuItemSchema,
  updateMenuItemSchema,
} from "@/apps/diet/schemas/menu-item"
import {
  createMenuItem,
  deleteMenuItem,
  updateMenuItem,
} from "@/apps/diet/services/menu-items"

const revalidateDiet = () => {
  revalidatePath("/diet")
  revalidatePath("/dashboard")
}

export const createMenuItemAction = async (formData: FormData) => {
  const categoryRaw = String(formData.get("category") ?? "").trim()
  const parsed = createMenuItemSchema.safeParse({
    name: formData.get("name"),
    category: categoryRaw || null,
    servingLabel: formData.get("servingLabel") || "1 serving",
    calories: formData.get("calories"),
    carbsG: formData.get("carbsG"),
    proteinG: formData.get("proteinG"),
    fatG: formData.get("fatG"),
    notes: formData.get("notes") || null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid menu item." }
  }

  try {
    await createMenuItem(parsed.data)
    revalidateDiet()
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create menu item.",
    }
  }
}

export const updateMenuItemAction = async (formData: FormData) => {
  const categoryRaw = String(formData.get("category") ?? "").trim()
  const parsed = updateMenuItemSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    category: categoryRaw || null,
    servingLabel: formData.get("servingLabel") || "1 serving",
    calories: formData.get("calories"),
    carbsG: formData.get("carbsG"),
    proteinG: formData.get("proteinG"),
    fatG: formData.get("fatG"),
    notes: formData.get("notes") || null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid menu item." }
  }

  try {
    await updateMenuItem(parsed.data)
    revalidateDiet()
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update menu item.",
    }
  }
}

export const deleteMenuItemAction = async (formData: FormData) => {
  const id = String(formData.get("id") ?? "")
  if (!id) {
    return { error: "Menu item id is required." }
  }

  try {
    await deleteMenuItem(id)
    revalidateDiet()
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete menu item.",
    }
  }
}
