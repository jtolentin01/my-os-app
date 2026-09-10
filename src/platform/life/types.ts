export const LIFE_APPS = ["health", "diet", "money", "notes"] as const

export type LifeAppId = (typeof LIFE_APPS)[number]

export const REPORT_CADENCES = ["daily", "weekly"] as const

export type ReportCadence = (typeof REPORT_CADENCES)[number]

export const LIFE_CONFIDENCE = ["low", "medium", "high"] as const

export type LifeConfidence = (typeof LIFE_CONFIDENCE)[number]

export type ReportPreferences = {
  user_id: string
  enabled: boolean
  notify_push: boolean
  cadence: ReportCadence
  timezone: string
  preferred_hour: number
  apps: LifeAppId[]
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export type HealthAssessment = {
  status: "improving" | "stable" | "declining" | "insufficient_data"
  bmi_band: "underweight" | "healthy" | "overweight" | "obese" | "unknown"
  weight_trend: "down" | "flat" | "up" | "unknown"
  activity_level: "sedentary" | "light" | "active" | "very_active" | "unknown"
  summary: string
  advice: string[]
}

export type DietAssessment = {
  status:
    | "balanced"
    | "protein_heavy"
    | "fat_heavy"
    | "carb_heavy"
    | "underfueled"
    | "inconsistent"
    | "insufficient_data"
  avg_daily_calories: number | null
  avg_protein_g: number | null
  avg_carbs_g: number | null
  avg_fat_g: number | null
  meal_coverage_pct: number | null
  summary: string
  advice: string[]
}

export type MoneyAssessment = {
  status: "stable" | "building" | "stressed" | "debt_heavy" | "insufficient_data"
  income_trend: "growing" | "flat" | "shrinking" | "unknown"
  expense_trend: "up" | "flat" | "down" | "unknown"
  debt_pressure: "none" | "manageable" | "high" | "unknown"
  summary: string
  advice: string[]
}

export type NotesAssessment = {
  themes: string[]
  interests: string[]
  open_problems: string[]
  emotional_signals: string[]
  summary: string
  advice_posture: string
}

export type UserLifeProfile = {
  user_id: string
  generated_at: string
  window_days: number
  confidence: LifeConfidence
  portrait_summary: string
  priorities: string[]
  risks: string[]
  strengths: string[]
  health: HealthAssessment
  diet: DietAssessment
  money: MoneyAssessment
  notes: NotesAssessment
  stats_snapshot: LifeStats
  updated_at: string
}

export type UserReport = {
  id: string
  user_id: string
  cadence: ReportCadence
  period_start: string
  period_end: string
  apps_included: LifeAppId[]
  stats: LifeStats
  content: string
  domain_deltas: Record<string, string>
  created_at: string
}

export type HealthStats = {
  latest_weight_kg: number | null
  earliest_weight_kg: number | null
  weight_delta_kg: number | null
  latest_height_cm: number | null
  latest_bmi: number | null
  bmi_category: string | null
  metric_count: number
  workout_count: number
  workout_done_count: number
  workout_minutes: number
  workout_types: Record<string, number>
}

export type DietStats = {
  meal_count: number
  meals_with_nutrition: number
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  avg_daily_calories: number | null
  avg_daily_protein_g: number | null
  avg_daily_carbs_g: number | null
  avg_daily_fat_g: number | null
  macro_split_pct: {
    protein: number
    carbs: number
    fat: number
  } | null
  breakfast_count: number
  lunch_count: number
  dinner_count: number
  snack_count: number
  meal_coverage_pct: number | null
}

export type MoneyStats = {
  currency: string
  income: number
  expense: number
  net: number
  transaction_count: number
  previous_income: number
  previous_expense: number
  previous_net: number
  top_expense_categories: Array<{ category: string; amount: number }>
  open_debt_count: number
  i_owe_total: number
  owed_to_me_total: number
  due_soon_count: number
  due_soon_total: number
}

export type NotesStats = {
  note_count: number
  pinned_count: number
  samples: Array<{
    id: string
    title: string
    is_pinned: boolean
    excerpt: string
  }>
}

export type LifeStats = {
  user_id: string
  timezone: string
  window_days: number
  period_start: string
  period_end: string
  apps: LifeAppId[]
  health: HealthStats | null
  diet: DietStats | null
  money: MoneyStats | null
  notes: NotesStats | null
}
