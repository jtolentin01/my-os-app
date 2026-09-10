import { gatherLifeStats } from "@/platform/life/gather"
import { generateLifeFoundation } from "@/platform/life/generate"
import { buildLifeReportPushSummary } from "@/platform/life/push-summary"
import {
  getLifeProfileForUser,
  listEnabledReportPreferences,
  saveLifeFoundation,
} from "@/platform/life/services"
import { getZonedNow } from "@/platform/life/date"
import type {
  LifeAppId,
  ReportCadence,
  ReportPreferences,
  UserLifeProfile,
  UserReport,
} from "@/platform/life/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendLifeReportNotification } from "@/platform/push/send-life-report-notification"

const windowDaysForCadence = (cadence: ReportCadence) =>
  cadence === "daily" ? 7 : 30

const isDue = (prefs: ReportPreferences, now: Date = new Date()) => {
  const zoned = getZonedNow(prefs.timezone, now)
  if (zoned.hour !== prefs.preferred_hour) {
    return false
  }

  if (!prefs.last_run_at) {
    return true
  }

  const last = new Date(prefs.last_run_at)
  if (Number.isNaN(last.getTime())) {
    return true
  }

  const elapsedMs = now.getTime() - last.getTime()
  const minMs =
    prefs.cadence === "daily" ? 20 * 60 * 60 * 1000 : 6 * 24 * 60 * 60 * 1000

  return elapsedMs >= minMs
}

const markLastRun = async (userId: string, at: string) => {
  const supabase = createAdminClient()
  await supabase
    .from("report_preferences")
    .update({ last_run_at: at, updated_at: at })
    .eq("user_id", userId)
}

const notifyLifeReportSafe = async (input: {
  userId: string
  cadence: ReportCadence
  generation: Parameters<typeof buildLifeReportPushSummary>[0]["generation"]
  profile: UserLifeProfile
  report: UserReport
}) => {
  try {
    const body = buildLifeReportPushSummary({
      cadence: input.cadence,
      generation: input.generation,
      profile: input.profile,
    })
    const title =
      input.cadence === "daily" ? "Daily life report" : "Weekly life report"

    return await sendLifeReportNotification({
      userId: input.userId,
      title,
      body,
      reportId: input.report.id,
    })
  } catch {
    return { sent: 0, subscriptions: 0 }
  }
}

export const buildLifeReportForUser = async (input: {
  userId: string
  timezone?: string
  cadence?: ReportCadence
  apps?: LifeAppId[]
  windowDays?: number
  touchPreferences?: boolean
  notifyPush?: boolean
}): Promise<{
  profile: UserLifeProfile
  report: UserReport
  pushSent: number
}> => {
  const cadence = input.cadence ?? "weekly"
  const timezone = input.timezone ?? "Asia/Manila"
  const windowDays = input.windowDays ?? windowDaysForCadence(cadence)

  const previous = await getLifeProfileForUser(input.userId)
  const stats = await gatherLifeStats({
    userId: input.userId,
    timezone,
    windowDays,
    apps: input.apps,
  })

  const generation = await generateLifeFoundation({
    stats,
    previousProfile: previous,
  })

  const saved = await saveLifeFoundation({
    userId: input.userId,
    stats,
    generation,
    cadence,
    previous,
  })

  if (input.touchPreferences !== false) {
    await markLastRun(input.userId, new Date().toISOString())
  }

  let pushSent = 0
  if (input.notifyPush) {
    const pushResult = await notifyLifeReportSafe({
      userId: input.userId,
      cadence,
      generation,
      profile: saved.profile,
      report: saved.report,
    })
    pushSent = pushResult.sent
  }

  return { ...saved, pushSent }
}

export const runDueLifeReports = async (input?: {
  limit?: number
  now?: Date
}) => {
  const limit = input?.limit ?? 20
  const now = input?.now ?? new Date()
  const preferences = await listEnabledReportPreferences(Math.max(limit * 3, 50))

  let processed = 0
  let skipped = 0
  let failed = 0
  let notified = 0
  const errors: string[] = []

  for (const prefs of preferences) {
    if (processed >= limit) {
      break
    }

    if (!isDue(prefs, now)) {
      skipped += 1
      continue
    }

    try {
      const result = await buildLifeReportForUser({
        userId: prefs.user_id,
        timezone: prefs.timezone,
        cadence: prefs.cadence,
        apps: prefs.apps,
        windowDays: windowDaysForCadence(prefs.cadence),
        touchPreferences: true,
        notifyPush: prefs.notify_push,
      })
      processed += 1
      notified += result.pushSent > 0 ? 1 : 0
    } catch (error) {
      failed += 1
      errors.push(
        `${prefs.user_id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  return { processed, skipped, failed, notified, errors }
}
