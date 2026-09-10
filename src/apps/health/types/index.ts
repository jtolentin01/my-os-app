export const WORKOUT_TYPES = [
  "run",
  "walk",
  "strength",
  "cycling",
  "swimming",
  "yoga",
  "hiit",
  "sports",
  "other",
] as const

export type WorkoutType = (typeof WORKOUT_TYPES)[number]

export const WORKOUT_STATUSES = ["planned", "done"] as const

export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number]

export type BodyMetric = {
  id: string
  user_id: string
  weight_kg: number | null
  height_cm: number | null
  notes: string | null
  logged_on: string
  created_at: string
  updated_at: string
}

export type HealthWorkout = {
  id: string
  user_id: string
  workout_type: WorkoutType
  title: string
  duration_minutes: number
  notes: string | null
  status: WorkoutStatus
  remind_at: string | null
  reminder_sent_at: string | null
  occurred_on: string
  created_at: string
  updated_at: string
}

export type MetricsSummary = {
  latestWeightKg: number | null
  latestHeightCm: number | null
  bmi: number | null
  weightChangeKg: number | null
  entryCount: number
}

export type WorkoutsSummary = {
  count: number
  doneCount: number
  plannedCount: number
  totalMinutes: number
  doneMinutes: number
}
