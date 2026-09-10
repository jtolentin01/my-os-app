import { createClient } from "@/lib/supabase/server"
import type {
  CreateBodyMetricInput,
  UpdateBodyMetricInput,
} from "@/apps/health/schemas/metric"
import type { BodyMetric } from "@/apps/health/types"
import { formatMonthKey, getMonthBounds } from "@/apps/health/utils/date"
import {
  normalizeBodyMetric,
  toMetricNumber,
} from "@/apps/health/utils/health"

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

export const listMetricsForMonth = async (
  monthKey: string = formatMonthKey()
): Promise<BodyMetric[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const { start, end } = getMonthBounds(monthKey)

  const { data, error } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_on", start)
    .lte("logged_on", end)
    .order("logged_on", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) =>
    normalizeBodyMetric(row as Record<string, unknown>)
  )
}

export const getLatestHeightCm = async (): Promise<number | null> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("body_metrics")
    .select("height_cm")
    .eq("user_id", userId)
    .not("height_cm", "is", null)
    .order("logged_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null
  return toMetricNumber(data.height_cm, 1)
}

export const getLatestWeightKg = async (): Promise<number | null> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("body_metrics")
    .select("weight_kg")
    .eq("user_id", userId)
    .not("weight_kg", "is", null)
    .order("logged_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null
  return toMetricNumber(data.weight_kg, 2)
}

export const getRecentMetrics = async (limit = 5): Promise<BodyMetric[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", userId)
    .order("logged_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) =>
    normalizeBodyMetric(row as Record<string, unknown>)
  )
}

export const createBodyMetric = async (input: CreateBodyMetricInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("body_metrics")
    .insert({
      user_id: userId,
      weight_kg: input.weightKg,
      height_cm: input.heightCm,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      logged_on: input.loggedOn,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeBodyMetric(data as Record<string, unknown>)
}

export const updateBodyMetric = async (input: UpdateBodyMetricInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("body_metrics")
    .update({
      weight_kg: input.weightKg,
      height_cm: input.heightCm,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      logged_on: input.loggedOn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeBodyMetric(data as Record<string, unknown>)
}

export const deleteBodyMetric = async (id: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data: existing, error: existingError } = await supabase
    .from("body_metrics")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (!existing) {
    throw new Error("Metric entry not found.")
  }

  const { error } = await supabase
    .from("body_metrics")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}
