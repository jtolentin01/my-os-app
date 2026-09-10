import { createClient } from "@/lib/supabase/server"
import type {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  UpdateWorkoutStatusInput,
} from "@/apps/health/schemas/workout"
import type { HealthWorkout } from "@/apps/health/types"
import { formatMonthKey, getMonthBounds } from "@/apps/health/utils/date"
import { normalizeWorkout } from "@/apps/health/utils/health"
import { getCurrentUserId } from "@/apps/health/services/metrics"

export const listWorkoutsForMonth = async (
  monthKey: string = formatMonthKey()
): Promise<HealthWorkout[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const { start, end } = getMonthBounds(monthKey)

  const { data, error } = await supabase
    .from("health_workouts")
    .select("*")
    .eq("user_id", userId)
    .gte("occurred_on", start)
    .lte("occurred_on", end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) =>
    normalizeWorkout(row as Record<string, unknown>)
  )
}

export const getRecentWorkouts = async (
  limit = 5
): Promise<HealthWorkout[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("health_workouts")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) =>
    normalizeWorkout(row as Record<string, unknown>)
  )
}

export const createWorkout = async (input: CreateWorkoutInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const remindAt =
    input.status === "planned" && input.remindAt ? input.remindAt : null

  const { data, error } = await supabase
    .from("health_workouts")
    .insert({
      user_id: userId,
      workout_type: input.workoutType,
      title: input.title,
      duration_minutes: input.durationMinutes,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      status: input.status,
      remind_at: remindAt,
      reminder_sent_at: null,
      occurred_on: input.occurredOn,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeWorkout(data as Record<string, unknown>)
}

export const updateWorkout = async (input: UpdateWorkoutInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const remindAt =
    input.status === "planned" && input.remindAt ? input.remindAt : null

  const { data, error } = await supabase
    .from("health_workouts")
    .update({
      workout_type: input.workoutType,
      title: input.title,
      duration_minutes: input.durationMinutes,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      status: input.status,
      remind_at: remindAt,
      reminder_sent_at: null,
      occurred_on: input.occurredOn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeWorkout(data as Record<string, unknown>)
}

export const updateWorkoutStatus = async (
  input: UpdateWorkoutStatusInput
) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  }

  if (input.status === "done") {
    patch.remind_at = null
    patch.reminder_sent_at = null
  }

  const { data, error } = await supabase
    .from("health_workouts")
    .update(patch)
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeWorkout(data as Record<string, unknown>)
}

export const deleteWorkout = async (id: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data: existing, error: existingError } = await supabase
    .from("health_workouts")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (!existing) {
    throw new Error("Workout not found.")
  }

  const { error } = await supabase
    .from("health_workouts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}
