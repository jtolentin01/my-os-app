import { createClient } from "@/lib/supabase/server"
import type { Meal, MealPlan, MealPlanWithMeals } from "@/apps/diet/types"
import {
  formatWeekStart,
  getDayIsoDate,
  getWeekStart,
  isPastCalendarDay,
} from "@/apps/diet/utils/week"
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
    .select("*, menu_item:menu_items(*)")
    .eq("meal_plan_id", plan.id)
    .order("day_of_week", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (mealsError) {
    throw new Error(mealsError.message)
  }

  return {
    ...plan,
    meals: ((meals ?? []) as Array<Meal & { menu_item?: Meal["menu_item"] }>).map(
      (meal) => ({
        ...meal,
        servings: Number(meal.servings) || 1,
        menu_item_id: meal.menu_item_id ?? null,
        menu_item: meal.menu_item
          ? {
              ...meal.menu_item,
              calories: Number(meal.menu_item.calories) || 0,
              carbs_g: Number(meal.menu_item.carbs_g) || 0,
              protein_g: Number(meal.menu_item.protein_g) || 0,
              fat_g: Number(meal.menu_item.fat_g) || 0,
            }
          : null,
      })
    ),
  }
}

export const createMeal = async (input: {
  mealPlanId: string
  dayOfWeek: number
  mealType: string
  title: string
  notes?: string
  remindAt?: string | null
  menuItemId?: string | null
  servings?: number
}) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data: plan, error: planError } = await supabase
    .from("meal_plans")
    .select("week_start")
    .eq("id", input.mealPlanId)
    .eq("user_id", userId)
    .maybeSingle()

  if (planError) {
    throw new Error(planError.message)
  }

  if (!plan) {
    throw new Error("Meal plan not found.")
  }

  const dayIsoDate = getDayIsoDate(plan.week_start, input.dayOfWeek)
  if (isPastCalendarDay(dayIsoDate)) {
    throw new Error("You can't add meals to a past day.")
  }

  let title = input.title
  const menuItemId = input.menuItemId || null

  if (menuItemId) {
    const { data: menuItem, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name")
      .eq("id", menuItemId)
      .eq("user_id", userId)
      .maybeSingle()

    if (menuError) {
      throw new Error(menuError.message)
    }

    if (!menuItem) {
      throw new Error("Menu item not found.")
    }

    title = title.trim() || menuItem.name
  }

  const { data, error } = await supabase
    .from("meals")
    .insert({
      user_id: userId,
      meal_plan_id: input.mealPlanId,
      day_of_week: input.dayOfWeek,
      meal_type: input.mealType,
      title,
      notes: input.notes || null,
      remind_at: input.remindAt || null,
      reminder_sent_at: null,
      menu_item_id: menuItemId,
      servings: input.servings ?? 1,
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
  remindAt?: string | null
}) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("meals")
    .update({
      title: input.title,
      meal_type: input.mealType,
      notes: input.notes || null,
      remind_at: input.remindAt === undefined ? undefined : input.remindAt || null,
      reminder_sent_at: input.remindAt ? null : undefined,
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
