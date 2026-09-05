export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const

export type MealType = (typeof MEAL_TYPES)[number]

export const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

export const MENU_CATEGORIES = [
  "viand",
  "rice",
  "soup",
  "snack",
  "drink",
  "other",
] as const

export type MenuCategory = (typeof MENU_CATEGORIES)[number]

export type NutritionFacts = {
  calories: number
  carbs_g: number
  protein_g: number
  fat_g: number
}

export type MenuItem = {
  id: string
  user_id: string
  name: string
  category: string | null
  serving_label: string
  calories: number
  carbs_g: number
  protein_g: number
  fat_g: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type MealPlan = {
  id: string
  user_id: string
  week_start: string
  title: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Meal = {
  id: string
  user_id: string
  meal_plan_id: string
  day_of_week: number
  meal_type: MealType
  title: string
  notes: string | null
  sort_order: number
  remind_at: string | null
  reminder_sent_at: string | null
  menu_item_id: string | null
  servings: number
  created_at: string
  updated_at: string
  menu_item?: MenuItem | null
}

export type MealPlanWithMeals = MealPlan & {
  meals: Meal[]
}
