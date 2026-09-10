"use client"

import Link from "next/link"
import { MetricCard, MetricEditorDialog } from "@/apps/health/components/metric-form"
import {
  WorkoutCard,
  WorkoutEditorDialog,
} from "@/apps/health/components/workout-form"
import type {
  BodyMetric,
  HealthWorkout,
  MetricsSummary,
  WorkoutsSummary,
} from "@/apps/health/types"
import {
  formatMonthLabel,
  shiftMonthKey,
} from "@/apps/health/utils/date"
import {
  formatBmi,
  formatBmiCategoryLabel,
  formatDuration,
  formatHeight,
  formatWeight,
  formatWeightChange,
  getBmiCategory,
} from "@/apps/health/utils/health"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type HealthWorkspaceProps = {
  tab: "metrics" | "workouts"
  monthKey: string
  metrics: BodyMetric[]
  metricsSummary: MetricsSummary
  workouts: HealthWorkout[]
  workoutsSummary: WorkoutsSummary
  loadError?: string
  workoutsError?: string
}

export const HealthWorkspace = ({
  tab,
  monthKey,
  metrics,
  metricsSummary,
  workouts,
  workoutsSummary,
  loadError,
  workoutsError,
}: HealthWorkspaceProps) => {
  const prevMonth = shiftMonthKey(monthKey, -1)
  const nextMonth = shiftMonthKey(monthKey, 1)
  const metricsHref = `/health?tab=metrics&month=${monthKey}`
  const workoutsHref = `/health?tab=workouts&month=${monthKey}`
  const bmiCategory = getBmiCategory(metricsSummary.bmi)
  const bmiCategoryLabel = formatBmiCategoryLabel(bmiCategory)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track body metrics and workouts in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={metricsHref}
            className={cn(
              buttonVariants({
                variant: tab === "metrics" ? "default" : "outline",
                size: "sm",
              })
            )}
          >
            Metrics
          </Link>
          <Link
            href={workoutsHref}
            className={cn(
              buttonVariants({
                variant: tab === "workouts" ? "default" : "outline",
                size: "sm",
              })
            )}
          >
            Workouts
          </Link>
        </div>
      </div>

      {tab === "workouts" ? (
        workoutsError ? (
          <Card>
            <CardHeader>
              <CardTitle>Workouts unavailable</CardTitle>
              <CardDescription>
                The health tables may not be set up in Supabase yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{workoutsError}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Run the SQL in{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  supabase/migrations/202609110001_health.sql
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  supabase/migrations/202609110002_health_workout_status.sql
                </code>
                , and{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  supabase/migrations/202609110003_health_workout_reminders.sql
                </code>{" "}
                in your Supabase SQL editor, then refresh this page.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/health?tab=workouts&month=${prevMonth}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  Previous
                </Link>
                <span className="px-1 text-sm font-medium tabular-nums">
                  {formatMonthLabel(monthKey)}
                </span>
                <Link
                  href={`/health?tab=workouts&month=${nextMonth}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  Next
                </Link>
              </div>
              <WorkoutEditorDialog />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card size="sm">
                <CardHeader>
                  <CardDescription>Workouts</CardDescription>
                  <CardTitle>{workoutsSummary.count}</CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>Done</CardDescription>
                  <CardTitle>{workoutsSummary.doneCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>Total time</CardDescription>
                  <CardTitle>
                    {formatDuration(workoutsSummary.totalMinutes)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {workouts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-card px-4 py-12 text-center">
                <p className="text-sm font-medium">No workouts this month</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plan a workout or log one you already finished.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {workouts.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))}
              </div>
            )}
          </>
        )
      ) : loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Health unavailable</CardTitle>
            <CardDescription>
              The health tables may not be set up in Supabase yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Run the SQL in{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                supabase/migrations/202609110001_health.sql
              </code>{" "}
              in your Supabase SQL editor, then refresh this page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/health?tab=metrics&month=${prevMonth}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                Previous
              </Link>
              <span className="px-1 text-sm font-medium tabular-nums">
                {formatMonthLabel(monthKey)}
              </span>
              <Link
                href={`/health?tab=metrics&month=${nextMonth}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                Next
              </Link>
            </div>
            <MetricEditorDialog />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Weight</CardDescription>
                <CardTitle>
                  {formatWeight(metricsSummary.latestWeightKg)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Height</CardDescription>
                <CardTitle>
                  {formatHeight(metricsSummary.latestHeightCm)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>BMI</CardDescription>
                <CardTitle
                  className={cn(
                    bmiCategory === "underweight" &&
                      "text-amber-700 dark:text-amber-400",
                    bmiCategory === "overweight" &&
                      "text-amber-700 dark:text-amber-400",
                    bmiCategory === "obese" && "text-destructive",
                    bmiCategory === "normal" &&
                      "text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {formatBmi(metricsSummary.bmi)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Change</CardDescription>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle
                    className={cn(
                      metricsSummary.weightChangeKg == null
                        ? undefined
                        : metricsSummary.weightChangeKg > 0
                          ? "text-destructive"
                          : metricsSummary.weightChangeKg < 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : undefined
                    )}
                  >
                    {formatWeightChange(metricsSummary.weightChangeKg)}
                  </CardTitle>
                  {bmiCategoryLabel ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 font-normal",
                        bmiCategory === "underweight" &&
                          "border-amber-500/40 text-amber-700 dark:text-amber-400",
                        bmiCategory === "normal" &&
                          "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
                        bmiCategory === "overweight" &&
                          "border-amber-500/40 text-amber-700 dark:text-amber-400",
                        bmiCategory === "obese" &&
                          "border-destructive/40 text-destructive"
                      )}
                    >
                      {bmiCategoryLabel}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
            </Card>
          </div>

          {metrics.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-card px-4 py-12 text-center">
              <p className="text-sm font-medium">No metrics this month</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Log weight or height to start tracking.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {metrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
