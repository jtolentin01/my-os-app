import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId } from "@/apps/diet/services/meals"
import type { MenuItem } from "@/apps/diet/types"
import { roundNutrition } from "@/apps/diet/utils/nutrition"

const mapMenuItem = (row: Record<string, unknown>): MenuItem => ({
  id: String(row.id),
  user_id: String(row.user_id),
  name: String(row.name),
  category: (row.category as string | null) ?? null,
  serving_label: String(row.serving_label ?? "1 serving"),
  calories: Number(row.calories) || 0,
  carbs_g: Number(row.carbs_g) || 0,
  protein_g: Number(row.protein_g) || 0,
  fat_g: Number(row.fat_g) || 0,
  notes: (row.notes as string | null) ?? null,
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
})

export const listMenuItems = async (query?: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  let request = supabase
    .from("menu_items")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true })

  const trimmed = query?.trim()
  if (trimmed) {
    request = request.ilike("name", `%${trimmed}%`)
  }

  const { data, error } = await request

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapMenuItem(row as Record<string, unknown>))
}

export const getMenuItem = async (id: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error("Menu item not found.")
  }

  return mapMenuItem(data as Record<string, unknown>)
}

export const createMenuItem = async (input: {
  name: string
  category?: string | null
  servingLabel: string
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  notes?: string | null
}) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      user_id: userId,
      name: input.name,
      category: input.category || null,
      serving_label: input.servingLabel,
      calories: roundNutrition(input.calories),
      carbs_g: roundNutrition(input.carbsG),
      protein_g: roundNutrition(input.proteinG),
      fat_g: roundNutrition(input.fatG),
      notes: input.notes || null,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapMenuItem(data as Record<string, unknown>)
}

export const updateMenuItem = async (input: {
  id: string
  name: string
  category?: string | null
  servingLabel: string
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  notes?: string | null
}) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("menu_items")
    .update({
      name: input.name,
      category: input.category || null,
      serving_label: input.servingLabel,
      calories: roundNutrition(input.calories),
      carbs_g: roundNutrition(input.carbsG),
      protein_g: roundNutrition(input.proteinG),
      fat_g: roundNutrition(input.fatG),
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapMenuItem(data as Record<string, unknown>)
}

export const deleteMenuItem = async (id: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}
