"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { reportPreferencesInputSchema } from "@/platform/life/schemas"
import {
  getLatestReport,
  getLifeProfile,
  getReportPreferences,
  listRecentReports,
  upsertReportPreferences,
} from "@/platform/life/services"
import { buildLifeReportForUser } from "@/platform/life/run-reports"
import type {
  ReportPreferences,
  UserLifeProfile,
  UserReport,
} from "@/platform/life/types"

const revalidateLifePaths = () => {
  revalidatePath("/settings")
  revalidatePath("/dashboard")
  revalidatePath("/reports")
  revalidatePath("/chat")
}

export const getReportPreferencesAction = async () => {
  try {
    const preferences = await getReportPreferences()
    return { success: true as const, preferences }
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load report preferences.",
      preferences: null as ReportPreferences | null,
    }
  }
}

export const saveReportPreferencesAction = async (input: {
  enabled: boolean
  notify_push?: boolean
  cadence?: string
  timezone?: string
  preferred_hour?: number
  apps?: string[]
}): Promise<{
  success?: boolean
  error?: string
  preferences?: ReportPreferences
}> => {
  const parsed = reportPreferencesInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid preferences.",
    }
  }

  try {
    const preferences = await upsertReportPreferences(parsed.data)
    revalidateLifePaths()
    return { success: true, preferences }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to save report preferences.",
    }
  }
}

export const generateLifeReportNowAction = async (): Promise<{
  success?: boolean
  error?: string
  profile?: UserLifeProfile
  report?: UserReport
  pushSent?: number
}> => {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const preferences = await getReportPreferences()
    const result = await buildLifeReportForUser({
      userId: user.id,
      timezone: preferences.timezone,
      cadence: preferences.cadence,
      apps: preferences.apps,
      touchPreferences: true,
      notifyPush: preferences.notify_push,
    })

    revalidateLifePaths()
    return {
      success: true,
      profile: result.profile,
      report: result.report,
      pushSent: result.pushSent,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate life report.",
    }
  }
}

export const getLifeOverviewAction = async () => {
  try {
    const [profile, report, preferences] = await Promise.all([
      getLifeProfile(),
      getLatestReport(),
      getReportPreferences(),
    ])
    return { success: true as const, profile, report, preferences }
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to load life overview.",
      profile: null as UserLifeProfile | null,
      report: null as UserReport | null,
      preferences: null as ReportPreferences | null,
    }
  }
}

export const listReportsAction = async () => {
  try {
    const reports = await listRecentReports(20)
    return { success: true as const, reports }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load reports.",
      reports: [] as UserReport[],
    }
  }
}
