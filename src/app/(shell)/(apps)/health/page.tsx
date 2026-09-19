import { HealthWorkspace } from "@/apps/health/components/health-workspace"
import {
  getLatestHeightCm,
  listMetricsForMonth,
  listMetricsForMonthPage,
} from "@/apps/health/services/metrics"
import {
  listWorkoutsForMonth,
  listWorkoutsForMonthPage,
} from "@/apps/health/services/workouts"
import type {
  BodyMetric,
  HealthWorkout,
  MetricsSummary,
  WorkoutsSummary,
} from "@/apps/health/types"
import {
  formatMonthKey,
  isValidMonthParam,
} from "@/apps/health/utils/date"
import {
  summarizeMetrics,
  summarizeWorkouts,
} from "@/apps/health/utils/health"
import { parsePageParam } from "@/lib/pagination"
import { redirect } from "next/navigation"

type HealthPageProps = {
  searchParams: Promise<{ month?: string; tab?: string; page?: string }>
}

const emptyMetricsSummary = (): MetricsSummary => ({
  latestWeightKg: null,
  latestHeightCm: null,
  bmi: null,
  weightChangeKg: null,
  entryCount: 0,
})

const emptyWorkoutsSummary = (): WorkoutsSummary => ({
  count: 0,
  doneCount: 0,
  plannedCount: 0,
  totalMinutes: 0,
  doneMinutes: 0,
})

const HealthPage = async ({ searchParams }: HealthPageProps) => {
  const params = await searchParams
  const tab = params.tab === "workouts" ? "workouts" : "metrics"
  const monthKey = isValidMonthParam(params.month)
    ? params.month!
    : formatMonthKey()
  const page = parsePageParam(params.page)

  let metrics: BodyMetric[] = []
  let metricsPage = 1
  let metricsTotalPages = 1
  let metricsSummary = emptyMetricsSummary()
  let workouts: HealthWorkout[] = []
  let workoutsPage = 1
  let workoutsTotalPages = 1
  let workoutsSummary = emptyWorkoutsSummary()
  let loadError = ""
  let workoutsError = ""

  if (tab === "workouts") {
    const [summaryResult, pageResult] = await Promise.allSettled([
      listWorkoutsForMonth(monthKey),
      listWorkoutsForMonthPage(monthKey, page),
    ])

    if (summaryResult.status === "fulfilled") {
      workoutsSummary = summarizeWorkouts(summaryResult.value)
    }

    if (pageResult.status === "fulfilled") {
      workouts = pageResult.value.items
      workoutsPage = pageResult.value.page
      workoutsTotalPages = pageResult.value.totalPages
      if (page > pageResult.value.totalPages && pageResult.value.total > 0) {
        redirect(
          `/health?tab=workouts&month=${monthKey}&page=${pageResult.value.totalPages}`
        )
      }
    } else {
      const error = pageResult.reason
      workoutsError =
        error instanceof Error
          ? error.message
          : "Unable to load workouts. Make sure the health migration has been applied."
    }

    if (summaryResult.status === "rejected" && !workoutsError) {
      const error = summaryResult.reason
      workoutsError =
        error instanceof Error
          ? error.message
          : "Unable to load workouts. Make sure the health migration has been applied."
    }
  } else {
    const [summaryResult, pageResult] = await Promise.allSettled([
      Promise.all([listMetricsForMonth(monthKey), getLatestHeightCm()]),
      listMetricsForMonthPage(monthKey, page),
    ])

    if (summaryResult.status === "fulfilled") {
      const [monthMetrics, latestHeightCm] = summaryResult.value
      metricsSummary = summarizeMetrics(monthMetrics, latestHeightCm)
    }

    if (pageResult.status === "fulfilled") {
      metrics = pageResult.value.items
      metricsPage = pageResult.value.page
      metricsTotalPages = pageResult.value.totalPages
      if (page > pageResult.value.totalPages && pageResult.value.total > 0) {
        redirect(
          `/health?tab=metrics&month=${monthKey}&page=${pageResult.value.totalPages}`
        )
      }
    } else {
      const error = pageResult.reason
      loadError =
        error instanceof Error
          ? error.message
          : "Unable to load your health metrics. Make sure the database migration has been applied."
    }

    if (summaryResult.status === "rejected" && !loadError) {
      const error = summaryResult.reason
      loadError =
        error instanceof Error
          ? error.message
          : "Unable to load your health metrics. Make sure the database migration has been applied."
    }
  }

  return (
    <HealthWorkspace
      tab={tab}
      monthKey={monthKey}
      metrics={metrics}
      metricsPage={metricsPage}
      metricsTotalPages={metricsTotalPages}
      metricsSummary={metricsSummary}
      workouts={workouts}
      workoutsPage={workoutsPage}
      workoutsTotalPages={workoutsTotalPages}
      workoutsSummary={workoutsSummary}
      loadError={loadError || undefined}
      workoutsError={workoutsError || undefined}
    />
  )
}

export default HealthPage
