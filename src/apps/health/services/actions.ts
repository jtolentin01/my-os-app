"use server"

import { revalidatePath } from "next/cache"
import {
  createBodyMetricSchema,
  updateBodyMetricSchema,
} from "@/apps/health/schemas/metric"
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  updateWorkoutStatusSchema,
} from "@/apps/health/schemas/workout"
import {
  createBodyMetric,
  deleteBodyMetric,
  updateBodyMetric,
} from "@/apps/health/services/metrics"
import {
  createWorkout,
  deleteWorkout,
  updateWorkout,
  updateWorkoutStatus,
} from "@/apps/health/services/workouts"
import type { BodyMetric, HealthWorkout } from "@/apps/health/types"

const revalidateHealth = () => {
  revalidatePath("/health")
  revalidatePath("/dashboard")
}

type MetricActionResult = {
  success?: boolean
  error?: string
  metric?: BodyMetric
}

type WorkoutActionResult = {
  success?: boolean
  error?: string
  workout?: HealthWorkout
}

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (value == null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

const statusFromForm = (formData: FormData) => {
  const raw = formData.get("status")
  if (raw === "done" || raw === "on" || raw === "true") return "done"
  if (raw === "planned") return "planned"
  return formData.get("alreadyDone") === "on" ? "done" : "planned"
}

export const createBodyMetricAction = async (
  formData: FormData
): Promise<MetricActionResult> => {
  const parsed = createBodyMetricSchema.safeParse({
    weightKg: emptyToNull(formData.get("weightKg")),
    heightCm: emptyToNull(formData.get("heightCm")),
    notes: emptyToNull(formData.get("notes")),
    loggedOn: formData.get("loggedOn"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid metric data.",
    }
  }

  try {
    const metric = await createBodyMetric(parsed.data)
    revalidateHealth()
    return { success: true, metric }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create metric.",
    }
  }
}

export const updateBodyMetricAction = async (
  formData: FormData
): Promise<MetricActionResult> => {
  const parsed = updateBodyMetricSchema.safeParse({
    id: formData.get("id"),
    weightKg: emptyToNull(formData.get("weightKg")),
    heightCm: emptyToNull(formData.get("heightCm")),
    notes: emptyToNull(formData.get("notes")),
    loggedOn: formData.get("loggedOn"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid metric data.",
    }
  }

  try {
    const metric = await updateBodyMetric(parsed.data)
    revalidateHealth()
    return { success: true, metric }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update metric.",
    }
  }
}

export const deleteBodyMetricAction = async (
  formData: FormData
): Promise<MetricActionResult> => {
  const id = String(formData.get("id") ?? "")

  if (!id) {
    return { error: "Metric id is required." }
  }

  try {
    await deleteBodyMetric(id)
    revalidateHealth()
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete metric.",
    }
  }
}

export const createWorkoutAction = async (
  formData: FormData
): Promise<WorkoutActionResult> => {
  const remindAtRaw = formData.get("remindAt")
  const parsed = createWorkoutSchema.safeParse({
    workoutType: formData.get("workoutType"),
    title: formData.get("title"),
    durationMinutes: formData.get("durationMinutes"),
    notes: emptyToNull(formData.get("notes")),
    status: statusFromForm(formData),
    remindAt:
      typeof remindAtRaw === "string" && remindAtRaw.length > 0
        ? remindAtRaw
        : null,
    occurredOn: formData.get("occurredOn"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid workout data.",
    }
  }

  try {
    const workout = await createWorkout(parsed.data)
    revalidateHealth()
    return { success: true, workout }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create workout.",
    }
  }
}

export const updateWorkoutAction = async (
  formData: FormData
): Promise<WorkoutActionResult> => {
  const remindAtRaw = formData.get("remindAt")
  const parsed = updateWorkoutSchema.safeParse({
    id: formData.get("id"),
    workoutType: formData.get("workoutType"),
    title: formData.get("title"),
    durationMinutes: formData.get("durationMinutes"),
    notes: emptyToNull(formData.get("notes")),
    status: statusFromForm(formData),
    remindAt:
      typeof remindAtRaw === "string" && remindAtRaw.length > 0
        ? remindAtRaw
        : null,
    occurredOn: formData.get("occurredOn"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid workout data.",
    }
  }

  try {
    const workout = await updateWorkout(parsed.data)
    revalidateHealth()
    return { success: true, workout }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update workout.",
    }
  }
}

export const updateWorkoutStatusAction = async (
  formData: FormData
): Promise<WorkoutActionResult> => {
  const parsed = updateWorkoutStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid workout status.",
    }
  }

  try {
    const workout = await updateWorkoutStatus(parsed.data)
    revalidateHealth()
    return { success: true, workout }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update workout status.",
    }
  }
}

export const deleteWorkoutAction = async (
  formData: FormData
): Promise<WorkoutActionResult> => {
  const id = String(formData.get("id") ?? "")

  if (!id) {
    return { error: "Workout id is required." }
  }

  try {
    await deleteWorkout(id)
    revalidateHealth()
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete workout.",
    }
  }
}
