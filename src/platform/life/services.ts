import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEFAULT_LIFE_TIMEZONE } from "@/platform/life/date"
import type {
  DietAssessment,
  HealthAssessment,
  LifeAppId,
  LifeConfidence,
  MoneyAssessment,
  NotesAssessment,
  ReportCadence,
  ReportPreferences,
  UserLifeProfile,
  UserReport,
} from "@/platform/life/types"
import { LIFE_APPS } from "@/platform/life/types"
import type { LifeGenerationResult } from "@/platform/life/schemas"
import type { LifeStats } from "@/platform/life/types"

const getCurrentUserId = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  return user.id
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
}

const asLifeApps = (value: unknown): LifeAppId[] => {
  const apps = asStringArray(value).filter((app) =>
    (LIFE_APPS as readonly string[]).includes(app)
  ) as LifeAppId[]
  return apps.length ? apps : [...LIFE_APPS]
}

const emptyHealth = (): HealthAssessment => ({
  status: "insufficient_data",
  bmi_band: "unknown",
  weight_trend: "unknown",
  activity_level: "unknown",
  summary: "Not enough health data yet.",
  advice: [],
})

const emptyDiet = (): DietAssessment => ({
  status: "insufficient_data",
  avg_daily_calories: null,
  avg_protein_g: null,
  avg_carbs_g: null,
  avg_fat_g: null,
  meal_coverage_pct: null,
  summary: "Not enough diet data yet.",
  advice: [],
})

const emptyMoney = (): MoneyAssessment => ({
  status: "insufficient_data",
  income_trend: "unknown",
  expense_trend: "unknown",
  debt_pressure: "unknown",
  summary: "Not enough money data yet.",
  advice: [],
})

const emptyNotes = (): NotesAssessment => ({
  themes: [],
  interests: [],
  open_problems: [],
  emotional_signals: [],
  summary: "Not enough notes data yet.",
  advice_posture: "Stay practical and supportive.",
})

const mapProfile = (row: Record<string, unknown>): UserLifeProfile => ({
  user_id: String(row.user_id),
  generated_at: String(row.generated_at),
  window_days: Number(row.window_days) || 30,
  confidence: (String(row.confidence) as LifeConfidence) || "low",
  portrait_summary: String(row.portrait_summary || ""),
  priorities: asStringArray(row.priorities),
  risks: asStringArray(row.risks),
  strengths: asStringArray(row.strengths),
  health: {
    ...emptyHealth(),
    ...((row.health as HealthAssessment | null) ?? {}),
  },
  diet: {
    ...emptyDiet(),
    ...((row.diet as DietAssessment | null) ?? {}),
  },
  money: {
    ...emptyMoney(),
    ...((row.money as MoneyAssessment | null) ?? {}),
  },
  notes: {
    ...emptyNotes(),
    ...((row.notes as NotesAssessment | null) ?? {}),
  },
  stats_snapshot: (row.stats_snapshot as LifeStats) ?? {
    user_id: String(row.user_id),
    timezone: DEFAULT_LIFE_TIMEZONE,
    window_days: Number(row.window_days) || 30,
    period_start: "",
    period_end: "",
    apps: [...LIFE_APPS],
    health: null,
    diet: null,
    money: null,
    notes: null,
  },
  updated_at: String(row.updated_at),
})

const mapReport = (row: Record<string, unknown>): UserReport => ({
  id: String(row.id),
  user_id: String(row.user_id),
  cadence: String(row.cadence) as ReportCadence,
  period_start: String(row.period_start),
  period_end: String(row.period_end),
  apps_included: asLifeApps(row.apps_included),
  stats: (row.stats as LifeStats) ?? {
    user_id: String(row.user_id),
    timezone: DEFAULT_LIFE_TIMEZONE,
    window_days: 30,
    period_start: String(row.period_start),
    period_end: String(row.period_end),
    apps: asLifeApps(row.apps_included),
    health: null,
    diet: null,
    money: null,
    notes: null,
  },
  content: String(row.content || ""),
  domain_deltas:
    row.domain_deltas && typeof row.domain_deltas === "object"
      ? (row.domain_deltas as Record<string, string>)
      : {},
  created_at: String(row.created_at),
})

const mapPreferences = (row: Record<string, unknown>): ReportPreferences => ({
  user_id: String(row.user_id),
  enabled: Boolean(row.enabled),
  notify_push: row.notify_push == null ? true : Boolean(row.notify_push),
  cadence: (String(row.cadence) as ReportCadence) || "weekly",
  timezone: String(row.timezone || DEFAULT_LIFE_TIMEZONE),
  preferred_hour: Number(row.preferred_hour) || 7,
  apps: asLifeApps(row.apps),
  last_run_at: row.last_run_at == null ? null : String(row.last_run_at),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
})

export const defaultReportPreferences = (
  userId: string
): ReportPreferences => ({
  user_id: userId,
  enabled: false,
  notify_push: true,
  cadence: "weekly",
  timezone: DEFAULT_LIFE_TIMEZONE,
  preferred_hour: 7,
  apps: [...LIFE_APPS],
  last_run_at: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
})

export const getReportPreferences = async (): Promise<ReportPreferences> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("report_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return defaultReportPreferences(userId)
  }

  return mapPreferences(data as Record<string, unknown>)
}

export const upsertReportPreferences = async (input: {
  enabled: boolean
  notify_push: boolean
  cadence: ReportCadence
  timezone: string
  preferred_hour: number
  apps: LifeAppId[]
}): Promise<ReportPreferences> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("report_preferences")
    .upsert(
      {
        user_id: userId,
        enabled: input.enabled,
        notify_push: input.notify_push,
        cadence: input.cadence,
        timezone: input.timezone || DEFAULT_LIFE_TIMEZONE,
        preferred_hour: input.preferred_hour,
        apps: input.apps.length ? input.apps : [...LIFE_APPS],
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapPreferences(data as Record<string, unknown>)
}

export const getLifeProfile = async (): Promise<UserLifeProfile | null> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("user_life_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null
  return mapProfile(data as Record<string, unknown>)
}

export const getLifeProfileForUser = async (
  userId: string
): Promise<UserLifeProfile | null> => {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("user_life_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null
  return mapProfile(data as Record<string, unknown>)
}

export const listRecentReports = async (limit = 10): Promise<UserReport[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("user_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapReport(row as Record<string, unknown>))
}

export const getLatestReport = async (): Promise<UserReport | null> => {
  const reports = await listRecentReports(1)
  return reports[0] ?? null
}

export const saveLifeFoundation = async (input: {
  userId: string
  stats: LifeStats
  generation: LifeGenerationResult
  cadence: ReportCadence
  previous?: UserLifeProfile | null
}) => {
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const apps = input.stats.apps

  const health = apps.includes("health")
    ? input.generation.health
    : input.previous?.health ?? emptyHealth()
  const diet = apps.includes("diet")
    ? input.generation.diet
    : input.previous?.diet ?? emptyDiet()
  const money = apps.includes("money")
    ? input.generation.money
    : input.previous?.money ?? emptyMoney()
  const notes = apps.includes("notes")
    ? input.generation.notes
    : input.previous?.notes ?? emptyNotes()

  const { data: profileRow, error: profileError } = await supabase
    .from("user_life_profile")
    .upsert(
      {
        user_id: input.userId,
        generated_at: now,
        window_days: input.stats.window_days,
        confidence: input.generation.confidence,
        portrait_summary: input.generation.portrait_summary,
        priorities: input.generation.priorities,
        risks: input.generation.risks,
        strengths: input.generation.strengths,
        health,
        diet,
        money,
        notes,
        stats_snapshot: input.stats,
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single()

  if (profileError) {
    throw new Error(profileError.message)
  }

  const { data: reportRow, error: reportError } = await supabase
    .from("user_reports")
    .upsert(
      {
        user_id: input.userId,
        cadence: input.cadence,
        period_start: input.stats.period_start,
        period_end: input.stats.period_end,
        apps_included: apps,
        stats: input.stats,
        content: input.generation.report_markdown,
        domain_deltas: input.generation.domain_deltas ?? {},
      },
      { onConflict: "user_id,cadence,period_start" }
    )
    .select("*")
    .single()

  if (reportError) {
    throw new Error(reportError.message)
  }

  return {
    profile: mapProfile(profileRow as Record<string, unknown>),
    report: mapReport(reportRow as Record<string, unknown>),
  }
}

export const formatLifeProfileForPrompt = (
  profile: UserLifeProfile | null
) => {
  if (!profile) {
    return "No life foundation profile yet."
  }

  const lines = [
    `Portrait: ${profile.portrait_summary}`,
    `Confidence: ${profile.confidence}`,
    `Priorities: ${profile.priorities.join("; ") || "—"}`,
    `Risks: ${profile.risks.join("; ") || "—"}`,
    `Strengths: ${profile.strengths.join("; ") || "—"}`,
    `Health: ${profile.health.status} — ${profile.health.summary}`,
    `Diet: ${profile.diet.status} — ${profile.diet.summary}`,
    `Money: ${profile.money.status} — ${profile.money.summary}`,
    `Notes: ${profile.notes.summary}`,
  ]

  if (profile.notes.advice_posture) {
    lines.push(`Notes posture: ${profile.notes.advice_posture}`)
  }

  return lines.join("\n")
}

export const listEnabledReportPreferences = async (limit = 50) => {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("report_preferences")
    .select("*")
    .eq("enabled", true)
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapPreferences(row as Record<string, unknown>))
}
