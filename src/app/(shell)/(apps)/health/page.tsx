import { HealthWorkspace } from "@/apps/health/components/health-workspace"
import {
  getLatestHeightCm,
  listMetricsForMonth,
} from "@/apps/health/services/metrics"
import { listWorkoutsForMonth } from "@/apps/health/services/workouts"
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

type HealthPageProps = {
  searchParams: Promise<{ month?: string; tab?: string }>
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

  let metrics: BodyMetric[] = []
  let metricsSummary = emptyMetricsSummary()
  let workouts: HealthWorkout[] = []
  let workoutsSummary = emptyWorkoutsSummary()
  let loadError = ""
  let workoutsError = ""

  const [metricsResult, workoutsResult] = await Promise.allSettled([
    Promise.all([listMetricsForMonth(monthKey), getLatestHeightCm()]),
    listWorkoutsForMonth(monthKey),
  ])

  if (metricsResult.status === "fulfilled") {
    const [monthMetrics, latestHeightCm] = metricsResult.value
    metrics = monthMetrics
    metricsSummary = summarizeMetrics(monthMetrics, latestHeightCm)
  } else {
    const error = metricsResult.reason
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load your health metrics. Make sure the database migration has been applied."
  }

  if (workoutsResult.status === "fulfilled") {
    workouts = workoutsResult.value
    workoutsSummary = summarizeWorkouts(workouts)
  } else {
    const error = workoutsResult.reason
    workoutsError =
      error instanceof Error
        ? error.message
        : "Unable to load workouts. Make sure the health migration has been applied."
  }

  return (
    <HealthWorkspace
      tab={tab}
      monthKey={monthKey}
      metrics={metrics}
      metricsSummary={metricsSummary}
      workouts={workouts}
      workoutsSummary={workoutsSummary}
      loadError={loadError || undefined}
      workoutsError={workoutsError || undefined}
    />
  )
}

export default HealthPage
