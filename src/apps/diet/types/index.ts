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
  created_at: string
  updated_at: string
}

export type MealPlanWithMeals = MealPlan & {
  meals: Meal[]
}
