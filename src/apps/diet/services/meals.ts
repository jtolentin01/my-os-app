import { createClient } from "@/lib/supabase/server"
import type { Meal, MealPlan, MealPlanWithMeals } from "@/apps/diet/types"
import { formatWeekStart, getWeekStart } from "@/apps/diet/utils/week"
import { parseISO } from "date-fns"

export const getCurrentUserId = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  return user.id
}

export const getOrCreateMealPlan = async (
  weekStart?: string
): Promise<MealPlanWithMeals> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const resolvedWeekStart = formatWeekStart(
    getWeekStart(weekStart ? parseISO(weekStart) : new Date())
  )

  const { data: existing, error: existingError } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", resolvedWeekStart)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  let plan = existing as MealPlan | null

  if (!plan) {
    const { data: created, error: createError } = await supabase
      .from("meal_plans")
      .insert({
        user_id: userId,
        week_start: resolvedWeekStart,
        title: "Weekly meal plan",
      })
      .select("*")
      .single()

    if (createError) {
      if (createError.code === "23505") {
        const { data: raced, error: racedError } = await supabase
          .from("meal_plans")
          .select("*")
          .eq("user_id", userId)
          .eq("week_start", resolvedWeekStart)
          .single()

        if (racedError) {
          throw new Error(racedError.message)
        }

        plan = raced as MealPlan
      } else {
        throw new Error(createError.message)
      }
    } else {
      plan = created as MealPlan
    }
  }

  const { data: meals, error: mealsError } = await supabase
    .from("meals")
    .select("*")
    .eq("meal_plan_id", plan.id)
    .order("day_of_week", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (mealsError) {
    throw new Error(mealsError.message)
  }

  return {
    ...plan,
    meals: (meals ?? []) as Meal[],
  }
}

export const createMeal = async (input: {
  mealPlanId: string
  dayOfWeek: number
  mealType: string
  title: string
  notes?: string
}) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("meals")
    .insert({
      user_id: userId,
      meal_plan_id: input.mealPlanId,
      day_of_week: input.dayOfWeek,
      meal_type: input.mealType,
      title: input.title,
      notes: input.notes || null,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Meal
}

export const updateMeal = async (input: {
  id: string
  title: string
  mealType: string
  notes?: string
}) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("meals")
    .update({
      title: input.title,
      meal_type: input.mealType,
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

  return data as Meal
}

export const deleteMeal = async (id: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export const getMealCountForWeek = async (weekStart?: string) => {
  const plan = await getOrCreateMealPlan(weekStart)
  return plan.meals.length
}
