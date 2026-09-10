import { createAdminClient } from "@/lib/supabase/admin"
import { toPlainNoteText } from "@/apps/notes/utils/content"
import {
  computeBmi,
  getBmiCategory,
  toMetricNumber,
} from "@/apps/health/utils/health"
import { daysBetweenInclusive, periodBounds, shiftIsoDate } from "@/platform/life/date"
import type {
  DietStats,
  HealthStats,
  LifeAppId,
  LifeStats,
  MoneyStats,
  NotesStats,
} from "@/platform/life/types"
import { LIFE_APPS } from "@/platform/life/types"

const round1 = (value: number) => Math.round(value * 10) / 10

const normalizeApps = (apps?: LifeAppId[]) => {
  const selected = (apps?.length ? apps : [...LIFE_APPS]).filter((app) =>
    (LIFE_APPS as readonly string[]).includes(app)
  )
  return [...new Set(selected)] as LifeAppId[]
}

const emptyDietStats = (): DietStats => ({
  meal_count: 0,
  meals_with_nutrition: 0,
  total_calories: 0,
  total_protein_g: 0,
  total_carbs_g: 0,
  total_fat_g: 0,
  avg_daily_calories: null,
  avg_daily_protein_g: null,
  avg_daily_carbs_g: null,
  avg_daily_fat_g: null,
  macro_split_pct: null,
  breakfast_count: 0,
  lunch_count: 0,
  dinner_count: 0,
  snack_count: 0,
  meal_coverage_pct: null,
})

const gatherHealth = async (
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  periodStart: string,
  periodEnd: string
): Promise<HealthStats> => {
  const [{ data: metrics, error: metricsError }, { data: workouts, error: workoutsError }, { data: latestHeightRow, error: heightError }] =
    await Promise.all([
      supabase
        .from("body_metrics")
        .select("weight_kg, height_cm, logged_on")
        .eq("user_id", userId)
        .gte("logged_on", periodStart)
        .lte("logged_on", periodEnd)
        .order("logged_on", { ascending: true }),
      supabase
        .from("health_workouts")
        .select("workout_type, duration_minutes, status, occurred_on")
        .eq("user_id", userId)
        .gte("occurred_on", periodStart)
        .lte("occurred_on", periodEnd),
      supabase
        .from("body_metrics")
        .select("height_cm, logged_on")
        .eq("user_id", userId)
        .not("height_cm", "is", null)
        .order("logged_on", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  if (metricsError) throw new Error(metricsError.message)
  if (workoutsError) throw new Error(workoutsError.message)
  if (heightError) throw new Error(heightError.message)

  const metricRows = metrics ?? []
  const weights = metricRows
    .map((row) => toMetricNumber(row.weight_kg, 2))
    .filter((value): value is number => value != null)

  const earliestWeight = weights[0] ?? null
  const latestWeight = weights.length ? weights[weights.length - 1]! : null
  const latestHeight =
    toMetricNumber(latestHeightRow?.height_cm, 1) ??
    [...metricRows]
      .reverse()
      .map((row) => toMetricNumber(row.height_cm, 1))
      .find((value): value is number => value != null) ??
    null

  const latestBmi = computeBmi(latestWeight, latestHeight)
  const workoutRows = workouts ?? []
  const doneWorkouts = workoutRows.filter((row) => row.status === "done")
  const workoutTypes: Record<string, number> = {}
  let workoutMinutes = 0

  for (const workout of doneWorkouts) {
    const type = String(workout.workout_type || "other")
    workoutTypes[type] = (workoutTypes[type] ?? 0) + 1
    workoutMinutes += Number(workout.duration_minutes) || 0
  }

  return {
    latest_weight_kg: latestWeight,
    earliest_weight_kg: earliestWeight,
    weight_delta_kg:
      latestWeight != null && earliestWeight != null
        ? round1(latestWeight - earliestWeight)
        : null,
    latest_height_cm: latestHeight,
    latest_bmi: latestBmi,
    bmi_category: getBmiCategory(latestBmi),
    metric_count: metricRows.length,
    workout_count: workoutRows.length,
    workout_done_count: doneWorkouts.length,
    workout_minutes: workoutMinutes,
    workout_types: workoutTypes,
  }
}

const gatherDiet = async (
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  periodStart: string,
  periodEnd: string
): Promise<DietStats> => {
  const { data: plans, error: plansError } = await supabase
    .from("meal_plans")
    .select("id, week_start")
    .eq("user_id", userId)
    .gte("week_start", shiftIsoDate(periodStart, -7))
    .lte("week_start", periodEnd)

  if (plansError) {
    throw new Error(plansError.message)
  }

  const planIds = (plans ?? []).map((plan) => plan.id)
  if (planIds.length === 0) {
    return emptyDietStats()
  }

  const { data: meals, error: mealsError } = await supabase
    .from("meals")
    .select(
      "meal_type, servings, menu_item:menu_items(calories, carbs_g, protein_g, fat_g)"
    )
    .eq("user_id", userId)
    .in("meal_plan_id", planIds)

  if (mealsError) {
    throw new Error(mealsError.message)
  }

  const mealRows = meals ?? []
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let mealsWithNutrition = 0
  let breakfast = 0
  let lunch = 0
  let dinner = 0
  let snack = 0

  for (const meal of mealRows) {
    const mealType = String(meal.meal_type)
    if (mealType === "breakfast") breakfast += 1
    else if (mealType === "lunch") lunch += 1
    else if (mealType === "dinner") dinner += 1
    else snack += 1

    const menuRaw = meal.menu_item as unknown
    const menuItem = Array.isArray(menuRaw)
      ? (menuRaw[0] as
          | {
              calories: number
              carbs_g: number
              protein_g: number
              fat_g: number
            }
          | undefined)
      : (menuRaw as
          | {
              calories: number
              carbs_g: number
              protein_g: number
              fat_g: number
            }
          | null)

    if (!menuItem) continue

    const servings = Number(meal.servings) || 1
    totalCalories += (Number(menuItem.calories) || 0) * servings
    totalProtein += (Number(menuItem.protein_g) || 0) * servings
    totalCarbs += (Number(menuItem.carbs_g) || 0) * servings
    totalFat += (Number(menuItem.fat_g) || 0) * servings
    mealsWithNutrition += 1
  }

  const dayCount = daysBetweenInclusive(periodStart, periodEnd)
  const expectedCoreSlots = dayCount * 3
  const coreMeals = breakfast + lunch + dinner
  const calorieSum = totalProtein * 4 + totalCarbs * 4 + totalFat * 9

  return {
    meal_count: mealRows.length,
    meals_with_nutrition: mealsWithNutrition,
    total_calories: round1(totalCalories),
    total_protein_g: round1(totalProtein),
    total_carbs_g: round1(totalCarbs),
    total_fat_g: round1(totalFat),
    avg_daily_calories:
      mealsWithNutrition > 0 ? round1(totalCalories / dayCount) : null,
    avg_daily_protein_g:
      mealsWithNutrition > 0 ? round1(totalProtein / dayCount) : null,
    avg_daily_carbs_g:
      mealsWithNutrition > 0 ? round1(totalCarbs / dayCount) : null,
    avg_daily_fat_g:
      mealsWithNutrition > 0 ? round1(totalFat / dayCount) : null,
    macro_split_pct:
      calorieSum > 0
        ? {
            protein: Math.round(((totalProtein * 4) / calorieSum) * 100),
            carbs: Math.round(((totalCarbs * 4) / calorieSum) * 100),
            fat: Math.round(((totalFat * 9) / calorieSum) * 100),
          }
        : null,
    breakfast_count: breakfast,
    lunch_count: lunch,
    dinner_count: dinner,
    snack_count: snack,
    meal_coverage_pct:
      expectedCoreSlots > 0
        ? Math.round((coreMeals / expectedCoreSlots) * 100)
        : null,
  }
}

const summarizeTransactions = (
  rows: Array<{ type: string; amount: number | string; currency?: string; category?: string }>
) => {
  let income = 0
  let expense = 0
  let currency = "PHP"
  const categoryTotals = new Map<string, number>()

  for (const row of rows) {
    const amount = Number(row.amount) || 0
    if (row.currency) currency = String(row.currency)
    if (row.type === "income") {
      income += amount
      continue
    }
    expense += amount
    const category = String(row.category || "other")
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + amount)
  }

  return { income, expense, currency, categoryTotals }
}

const gatherMoney = async (
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  periodStart: string,
  periodEnd: string
): Promise<MoneyStats> => {
  const dayCount = daysBetweenInclusive(periodStart, periodEnd)
  const previousEnd = shiftIsoDate(periodStart, -1)
  const previousStart = shiftIsoDate(periodStart, -dayCount)

  const [
    { data: currentTx, error: currentError },
    { data: previousTx, error: previousError },
    { data: debts, error: debtsError },
  ] = await Promise.all([
    supabase
      .from("money_transactions")
      .select("type, amount, currency, category")
      .eq("user_id", userId)
      .gte("occurred_on", periodStart)
      .lte("occurred_on", periodEnd),
    supabase
      .from("money_transactions")
      .select("type, amount")
      .eq("user_id", userId)
      .gte("occurred_on", previousStart)
      .lte("occurred_on", previousEnd),
    supabase
      .from("money_debts")
      .select("direction, remaining_amount, currency, next_due_on, status")
      .eq("user_id", userId)
      .eq("status", "open"),
  ])

  if (currentError) throw new Error(currentError.message)
  if (previousError) throw new Error(previousError.message)
  if (debtsError) throw new Error(debtsError.message)

  const current = summarizeTransactions(currentTx ?? [])
  const previous = summarizeTransactions(previousTx ?? [])
  const dueSoonCutoff = shiftIsoDate(periodEnd, 14)

  let iOwe = 0
  let owedToMe = 0
  let dueSoonCount = 0
  let dueSoonTotal = 0
  let currency = current.currency

  for (const debt of debts ?? []) {
    const remaining = Number(debt.remaining_amount) || 0
    currency = String(debt.currency || currency)
    if (debt.direction === "i_owe") iOwe += remaining
    else owedToMe += remaining

    if (
      debt.direction === "i_owe" &&
      debt.next_due_on &&
      debt.next_due_on <= dueSoonCutoff
    ) {
      dueSoonCount += 1
      dueSoonTotal += remaining
    }
  }

  const topCategories = [...current.categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({
      category,
      amount: round1(amount),
    }))

  return {
    currency,
    income: round1(current.income),
    expense: round1(current.expense),
    net: round1(current.income - current.expense),
    transaction_count: (currentTx ?? []).length,
    previous_income: round1(previous.income),
    previous_expense: round1(previous.expense),
    previous_net: round1(previous.income - previous.expense),
    top_expense_categories: topCategories,
    open_debt_count: (debts ?? []).length,
    i_owe_total: round1(iOwe),
    owed_to_me_total: round1(owedToMe),
    due_soon_count: dueSoonCount,
    due_soon_total: round1(dueSoonTotal),
  }
}

const gatherNotes = async (
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  periodStart: string
): Promise<NotesStats> => {
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, is_pinned, updated_at")
    .eq("user_id", userId)
    .gte("updated_at", `${periodStart}T00:00:00.000Z`)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(error.message)
  }

  const rows = data ?? []
  return {
    note_count: rows.length,
    pinned_count: rows.filter((row) => row.is_pinned).length,
    samples: rows.slice(0, 12).map((row) => ({
      id: String(row.id),
      title: String(row.title || "Untitled"),
      is_pinned: Boolean(row.is_pinned),
      excerpt: toPlainNoteText(String(row.content || "")).slice(0, 280),
    })),
  }
}

export const gatherLifeStats = async (input: {
  userId: string
  timezone: string
  windowDays?: number
  apps?: LifeAppId[]
  now?: Date
}): Promise<LifeStats> => {
  const supabase = createAdminClient()
  const windowDays = input.windowDays ?? 30
  const apps = normalizeApps(input.apps)
  const { periodStart, periodEnd } = periodBounds({
    timeZone: input.timezone,
    windowDays,
    now: input.now,
  })

  const [health, diet, money, notes] = await Promise.all([
    apps.includes("health")
      ? gatherHealth(supabase, input.userId, periodStart, periodEnd)
      : Promise.resolve(null),
    apps.includes("diet")
      ? gatherDiet(supabase, input.userId, periodStart, periodEnd)
      : Promise.resolve(null),
    apps.includes("money")
      ? gatherMoney(supabase, input.userId, periodStart, periodEnd)
      : Promise.resolve(null),
    apps.includes("notes")
      ? gatherNotes(supabase, input.userId, periodStart)
      : Promise.resolve(null),
  ])

  return {
    user_id: input.userId,
    timezone: input.timezone,
    window_days: windowDays,
    period_start: periodStart,
    period_end: periodEnd,
    apps,
    health,
    diet,
    money,
    notes,
  }
}
