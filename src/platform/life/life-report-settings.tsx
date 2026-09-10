"use client"

import { useState, useTransition } from "react"
import {
  generateLifeReportNowAction,
  saveReportPreferencesAction,
} from "@/platform/life/actions"
import type {
  LifeAppId,
  ReportCadence,
  ReportPreferences,
  UserLifeProfile,
  UserReport,
} from "@/platform/life/types"
import { LIFE_APPS } from "@/platform/life/types"
import { ensurePushSubscription } from "@/platform/push/ensure-subscription"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type LifeReportSettingsProps = {
  preferences: ReportPreferences
  profile: UserLifeProfile | null
  latestReport: UserReport | null
}

export const LifeReportSettings = ({
  preferences: initialPreferences,
  profile: initialProfile,
  latestReport: initialReport,
}: LifeReportSettingsProps) => {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [profile, setProfile] = useState(initialProfile)
  const [latestReport, setLatestReport] = useState(initialReport)
  const [enabled, setEnabled] = useState(initialPreferences.enabled)
  const [notifyPush, setNotifyPush] = useState(initialPreferences.notify_push)
  const [cadence, setCadence] = useState<ReportCadence>(
    initialPreferences.cadence
  )
  const [preferredHour, setPreferredHour] = useState(
    String(initialPreferences.preferred_hour)
  )
  const [apps, setApps] = useState<LifeAppId[]>(initialPreferences.apps)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()

  const toggleApp = (app: LifeAppId) => {
    setApps((current) => {
      if (current.includes(app)) {
        if (current.length === 1) return current
        return current.filter((item) => item !== app)
      }
      return [...current, app]
    })
  }

  const persistPreferences = async (nextNotifyPush = notifyPush) => {
    if (nextNotifyPush) {
      const pushResult = await ensurePushSubscription()
      if (pushResult.error) {
        return { error: pushResult.error }
      }
    }

    return saveReportPreferencesAction({
      enabled,
      notify_push: nextNotifyPush,
      cadence,
      timezone: preferences.timezone,
      preferred_hour: Number(preferredHour),
      apps,
    })
  }

  const handleSave = () => {
    setError("")
    setMessage("")
    startTransition(async () => {
      const result = await persistPreferences()
      if (result.error || !("preferences" in result) || !result.preferences) {
        setError(result.error ?? "Failed to save preferences.")
        return
      }

      setPreferences(result.preferences)
      setNotifyPush(result.preferences.notify_push)
      setMessage("Life report preferences saved.")
    })
  }

  const handleGenerate = () => {
    setError("")
    setMessage("")
    startTransition(async () => {
      const saveResult = await persistPreferences()
      if (
        saveResult.error ||
        !("preferences" in saveResult) ||
        !saveResult.preferences
      ) {
        setError(saveResult.error ?? "Failed to save preferences.")
        return
      }

      setPreferences(saveResult.preferences)
      setNotifyPush(saveResult.preferences.notify_push)

      const result = await generateLifeReportNowAction()
      if (result.error || !result.profile || !result.report) {
        setError(result.error ?? "Failed to generate report.")
        return
      }

      setProfile(result.profile)
      setLatestReport(result.report)
      setMessage(
        result.pushSent
          ? "Life foundation generated and push sent."
          : "Life foundation and report generated."
      )
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border border-input"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          disabled={pending}
        />
        Enable scheduled life reports
      </label>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border border-input"
          checked={notifyPush}
          onChange={(event) => setNotifyPush(event.target.checked)}
          disabled={pending}
        />
        Push a short summary when a report is ready
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="life-cadence">Cadence</Label>
          <Select
            value={cadence}
            onValueChange={(value) => {
              if (!value) return
              setCadence(value as ReportCadence)
            }}
            disabled={pending}
          >
            <SelectTrigger id="life-cadence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="life-hour">Preferred hour</Label>
          <Select
            value={preferredHour}
            onValueChange={(value) => {
              if (!value) return
              setPreferredHour(value)
            }}
            disabled={pending}
          >
            <SelectTrigger id="life-hour">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, hour) => (
                <SelectItem key={hour} value={String(hour)}>
                  {String(hour).padStart(2, "0")}:00 ({preferences.timezone})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Include apps</p>
        <div className="flex flex-wrap gap-3">
          {LIFE_APPS.map((app) => (
            <label key={app} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="checkbox"
                className="size-4 rounded border border-input"
                checked={apps.includes(app)}
                onChange={() => toggleApp(app)}
                disabled={pending}
              />
              {app}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save preferences"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleGenerate}
          disabled={pending}
        >
          {pending ? "Working..." : "Generate now"}
        </Button>
      </div>

      {profile ? (
        <div className="rounded-lg border border-border/70 px-3 py-3 text-sm">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Current foundation · {profile.confidence} confidence
          </p>
          <p className="mt-2">{profile.portrait_summary}</p>
          {latestReport ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Latest report: {latestReport.period_start} to{" "}
              {latestReport.period_end}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No life foundation yet. Generate one to characterize health, diet,
          money, and notes.
        </p>
      )}
    </div>
  )
}
