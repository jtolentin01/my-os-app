import type {
  BodyMetric,
  HealthWorkout,
  MetricsSummary,
  WorkoutsSummary,
  WorkoutStatus,
  WorkoutType,
} from "@/apps/health/types"
import { WORKOUT_STATUSES, WORKOUT_TYPES } from "@/apps/health/types"

export const toMetricNumber = (value: unknown, digits = 2) => {
  if (value == null || value === "") return null
  const amount = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(amount)) return null
  const factor = 10 ** digits
  return Math.round(amount * factor) / factor
}

export const formatWeight = (kg: number | null) => {
  if (kg == null) return "—"
  return `${kg.toFixed(1)} kg`
}

export const formatHeight = (cm: number | null) => {
  if (cm == null) return "—"
  return `${cm % 1 === 0 ? cm.toFixed(0) : cm.toFixed(1)} cm`
}

export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

export const formatWorkoutTypeLabel = (type: string) =>
  type
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

export const formatWorkoutStatusLabel = (status: WorkoutStatus) =>
  status === "done" ? "Done" : "Planned"

const toWorkoutStatus = (value: unknown): WorkoutStatus => {
  if (
    typeof value === "string" &&
    (WORKOUT_STATUSES as readonly string[]).includes(value)
  ) {
    return value as WorkoutStatus
  }
  return "planned"
}

export const computeBmi = (
  weightKg: number | null,
  heightCm: number | null
) => {
  if (weightKg == null || heightCm == null || heightCm <= 0) return null
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  if (!Number.isFinite(bmi)) return null
  return Math.round(bmi * 10) / 10
}

export type BmiCategory =
  | "underweight"
  | "normal"
  | "overweight"
  | "obese"

export const getBmiCategory = (bmi: number | null): BmiCategory | null => {
  if (bmi == null || !Number.isFinite(bmi)) return null
  if (bmi < 18.5) return "underweight"
  if (bmi < 25) return "normal"
  if (bmi < 30) return "overweight"
  return "obese"
}

export const formatBmiCategoryLabel = (category: BmiCategory | null) => {
  if (!category) return null
  if (category === "normal") return "Normal"
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export const formatBmi = (bmi: number | null) => {
  if (bmi == null) return "—"
  return bmi.toFixed(1)
}

export const formatWeightChange = (changeKg: number | null) => {
  if (changeKg == null) return "—"
  const sign = changeKg > 0 ? "+" : ""
  return `${sign}${changeKg.toFixed(1)} kg`
}

const toWorkoutType = (value: unknown): WorkoutType => {
  if (
    typeof value === "string" &&
    (WORKOUT_TYPES as readonly string[]).includes(value)
  ) {
    return value as WorkoutType
  }
  return "other"
}

export const normalizeBodyMetric = (
  row: Record<string, unknown>
): BodyMetric => ({
  id: String(row.id),
  user_id: String(row.user_id),
  weight_kg: toMetricNumber(row.weight_kg, 2),
  height_cm: toMetricNumber(row.height_cm, 1),
  notes: row.notes == null ? null : String(row.notes),
  logged_on: String(row.logged_on),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
})

export const normalizeWorkout = (
  row: Record<string, unknown>
): HealthWorkout => ({
  id: String(row.id),
  user_id: String(row.user_id),
  workout_type: toWorkoutType(row.workout_type),
  title: String(row.title),
  duration_minutes: Math.max(0, Math.round(Number(row.duration_minutes) || 0)),
  notes: row.notes == null ? null : String(row.notes),
  status: toWorkoutStatus(row.status),
  remind_at: row.remind_at == null ? null : String(row.remind_at),
  reminder_sent_at:
    row.reminder_sent_at == null ? null : String(row.reminder_sent_at),
  occurred_on: String(row.occurred_on),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
})

export const summarizeMetrics = (
  metrics: BodyMetric[],
  latestHeightCm: number | null
): MetricsSummary => {
  const withWeight = metrics.filter((item) => item.weight_kg != null)
  const latestWeightKg = withWeight[0]?.weight_kg ?? null
  const earliestWeightKg =
    withWeight.length > 1
      ? withWeight[withWeight.length - 1]?.weight_kg ?? null
      : null

  let weightChangeKg: number | null = null
  if (latestWeightKg != null && earliestWeightKg != null && withWeight.length > 1) {
    weightChangeKg =
      Math.round((latestWeightKg - earliestWeightKg) * 10) / 10
  }

  const heightFromMonth = metrics.find((item) => item.height_cm != null)
    ?.height_cm
  const latestHeight = heightFromMonth ?? latestHeightCm

  return {
    latestWeightKg,
    latestHeightCm: latestHeight,
    bmi: computeBmi(latestWeightKg, latestHeight),
    weightChangeKg,
    entryCount: metrics.length,
  }
}

export const summarizeWorkouts = (
  workouts: HealthWorkout[]
): WorkoutsSummary => {
  let totalMinutes = 0
  let doneMinutes = 0
  let doneCount = 0
  let plannedCount = 0

  for (const workout of workouts) {
    totalMinutes += workout.duration_minutes
    if (workout.status === "done") {
      doneCount += 1
      doneMinutes += workout.duration_minutes
    } else {
      plannedCount += 1
    }
  }

  return {
    count: workouts.length,
    doneCount,
    plannedCount,
    totalMinutes,
    doneMinutes,
  }
}
