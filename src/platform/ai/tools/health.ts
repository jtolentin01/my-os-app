import { z } from "zod"
import { WORKOUT_STATUSES, WORKOUT_TYPES } from "@/apps/health/types"
import {
  createBodyMetric,
  deleteBodyMetric,
  getLatestHeightCm,
  getLatestWeightKg,
  getRecentMetrics,
  listMetricsForMonth,
} from "@/apps/health/services/metrics"
import {
  createWorkout,
  deleteWorkout,
  getRecentWorkouts,
  listWorkoutsForMonth,
  updateWorkoutStatus,
} from "@/apps/health/services/workouts"
import {
  formatCalendarDay,
  formatLoggedOn,
  formatMonthKey,
  formatMonthLabel,
  isValidMonthParam,
  shiftMonthKey,
} from "@/apps/health/utils/date"
import {
  computeBmi,
  formatBmi,
  formatDuration,
  formatHeight,
  formatWeight,
  formatWorkoutStatusLabel,
  formatWorkoutTypeLabel,
  summarizeMetrics,
  summarizeWorkouts,
} from "@/apps/health/utils/health"
import type { AiToolDefinition } from "@/platform/ai/tools/types"

const dateSchema = z.preprocess(
  (value) => {
    if (value == null || value === "") return ""
    return value
  },
  z
    .string()
    .trim()
    .max(32)
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Date must be YYYY-MM-DD.",
    })
)

const logMetricToolSchema = z
  .object({
    weightKg: z.number().positive().max(500).nullable().optional().default(null),
    heightCm: z.number().positive().max(300).nullable().optional().default(null),
    notes: z.string().trim().max(500).nullable().optional().default(null),
    loggedOn: dateSchema,
  })
  .superRefine((value, ctx) => {
    if (value.weightKg == null && value.heightCm == null) {
      ctx.addIssue({
        code: "custom",
        path: ["weightKg"],
        message: "Enter weight, height, or both.",
      })
    }
  })

const listMetricsToolSchema = z.object({
  monthOffset: z.number().int().min(-24).max(24).optional().default(0),
  limit: z.number().int().min(1).max(40).optional().default(20),
})

const getHealthSummaryToolSchema = z.object({
  monthOffset: z.number().int().min(-24).max(24).optional().default(0),
})

const deleteMetricToolSchema = z.object({
  id: z.string().uuid(),
})

const logWorkoutToolSchema = z
  .object({
    workoutType: z.enum(WORKOUT_TYPES),
    title: z.string().trim().min(1).max(160),
    durationMinutes: z.number().int().positive().max(1440),
    notes: z.string().trim().max(500).nullable().optional().default(null),
    status: z.enum(WORKOUT_STATUSES).optional().default("done"),
    remindAt: z.string().datetime().nullable().optional().default(null),
    occurredOn: dateSchema,
  })
  .superRefine((value, ctx) => {
    if (value.status === "done" && value.remindAt) {
      ctx.addIssue({
        code: "custom",
        path: ["remindAt"],
        message: "Reminders are only for planned workouts.",
      })
    }
    if (value.remindAt && new Date(value.remindAt).getTime() <= Date.now()) {
      ctx.addIssue({
        code: "custom",
        path: ["remindAt"],
        message: "Reminder time must be in the future.",
      })
    }
  })

const listWorkoutsToolSchema = z.object({
  monthOffset: z.number().int().min(-24).max(24).optional().default(0),
  status: z.enum(["planned", "done", "all"]).optional().default("all"),
  limit: z.number().int().min(1).max(40).optional().default(20),
})

const updateWorkoutStatusToolSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(WORKOUT_STATUSES),
})

const deleteWorkoutToolSchema = z.object({
  id: z.string().uuid(),
})

const resolveMonthKey = (monthOffset: number) => {
  const monthKey = shiftMonthKey(formatMonthKey(), monthOffset)
  return isValidMonthParam(monthKey) ? monthKey : formatMonthKey()
}

export const healthTools: AiToolDefinition[] = [
  {
    name: "log_body_metric",
    tool: {
      type: "function",
      name: "log_body_metric",
      description:
        "Log weight (kg) and/or height (cm) in Health. Provide at least one. loggedOn is YYYY-MM-DD; use today if unknown.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          weightKg: { type: ["number", "null"] },
          heightCm: { type: ["number", "null"] },
          notes: { type: ["string", "null"] },
          loggedOn: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = logMetricToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid metric data.",
        }
      }

      const metric = await createBodyMetric({
        weightKg: parsed.data.weightKg,
        heightCm: parsed.data.heightCm,
        notes: parsed.data.notes,
        loggedOn: parsed.data.loggedOn || formatCalendarDay(),
      })

      const parts = [
        metric.weight_kg != null ? formatWeight(metric.weight_kg) : null,
        metric.height_cm != null ? formatHeight(metric.height_cm) : null,
      ].filter(Boolean)

      return {
        ok: true,
        summary: `Logged ${parts.join(" / ")} for ${formatLoggedOn(metric.logged_on)}.`,
        data: metric,
      }
    },
  },
  {
    name: "list_body_metrics",
    tool: {
      type: "function",
      name: "list_body_metrics",
      description:
        "List Health body metric entries. monthOffset 0 is this month, -1 is last month.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          monthOffset: { type: "number" },
          limit: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = listMetricsToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid list request.",
        }
      }

      const monthKey = resolveMonthKey(parsed.data.monthOffset)
      const metrics = (await listMetricsForMonth(monthKey)).slice(
        0,
        parsed.data.limit
      )

      if (metrics.length === 0) {
        return {
          ok: true,
          summary: `No body metrics in ${formatMonthLabel(monthKey)}.`,
          data: [],
        }
      }

      const lines = metrics.map((metric) => {
        const parts = [
          metric.weight_kg != null ? formatWeight(metric.weight_kg) : null,
          metric.height_cm != null ? formatHeight(metric.height_cm) : null,
        ].filter(Boolean)
        return `${formatLoggedOn(metric.logged_on)}: ${parts.join(" / ")} (${metric.id})`
      })

      return {
        ok: true,
        summary: `${formatMonthLabel(monthKey)} metrics:\n${lines.join("\n")}`,
        data: metrics,
      }
    },
  },
  {
    name: "get_health_summary",
    tool: {
      type: "function",
      name: "get_health_summary",
      description:
        "Get Health summary: latest weight/height/BMI plus workout count and minutes for a month. monthOffset 0 is this month.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          monthOffset: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = getHealthSummaryToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid summary request.",
        }
      }

      const monthKey = resolveMonthKey(parsed.data.monthOffset)
      const [metrics, workouts, latestHeightCm, latestWeightKg] =
        await Promise.all([
          listMetricsForMonth(monthKey),
          listWorkoutsForMonth(monthKey),
          getLatestHeightCm(),
          getLatestWeightKg(),
        ])

      const metricsSummary = summarizeMetrics(metrics, latestHeightCm)
      const workoutsSummary = summarizeWorkouts(workouts)
      const weight =
        metricsSummary.latestWeightKg ?? latestWeightKg
      const height =
        metricsSummary.latestHeightCm ?? latestHeightCm
      const bmi = computeBmi(weight, height)

      return {
        ok: true,
        summary: `${formatMonthLabel(monthKey)}: weight ${formatWeight(weight)}, height ${formatHeight(height)}, BMI ${formatBmi(bmi)}, ${workoutsSummary.doneCount} done / ${workoutsSummary.count} workouts (${formatDuration(workoutsSummary.totalMinutes)}).`,
        data: {
          monthKey,
          weight,
          height,
          bmi,
          workouts: workoutsSummary,
          metricsCount: metricsSummary.entryCount,
        },
      }
    },
  },
  {
    name: "delete_body_metric",
    tool: {
      type: "function",
      name: "delete_body_metric",
      description: "Delete one Health body metric entry by id.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = deleteMetricToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid metric id.",
        }
      }

      await deleteBodyMetric(parsed.data.id)
      return {
        ok: true,
        summary: "Deleted the body metric entry.",
      }
    },
  },
  {
    name: "log_workout",
    tool: {
      type: "function",
      name: "log_workout",
      description:
        "Log a workout in Health. workoutType: run, walk, strength, cycling, swimming, yoga, hiit, sports, other. durationMinutes is total minutes. status planned or done (default done). For planned workouts, optional remindAt ISO datetime schedules a push reminder. occurredOn is YYYY-MM-DD; use today if unknown.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          workoutType: {
            type: "string",
            enum: [...WORKOUT_TYPES],
          },
          title: { type: "string" },
          durationMinutes: { type: "number" },
          notes: { type: ["string", "null"] },
          status: {
            type: "string",
            enum: [...WORKOUT_STATUSES],
          },
          remindAt: { type: ["string", "null"] },
          occurredOn: { type: "string" },
        },
        required: ["workoutType", "title", "durationMinutes"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = logWorkoutToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid workout data.",
        }
      }

      const workout = await createWorkout({
        workoutType: parsed.data.workoutType,
        title: parsed.data.title,
        durationMinutes: parsed.data.durationMinutes,
        notes: parsed.data.notes,
        status: parsed.data.status,
        remindAt: parsed.data.remindAt,
        occurredOn: parsed.data.occurredOn || formatCalendarDay(),
      })

      const reminderNote = workout.remind_at
        ? ` Reminder set for ${workout.remind_at}.`
        : ""

      return {
        ok: true,
        summary: `Logged ${formatWorkoutTypeLabel(workout.workout_type)} "${workout.title}" (${formatWorkoutStatusLabel(workout.status)}) for ${formatDuration(workout.duration_minutes)} on ${formatLoggedOn(workout.occurred_on)}.${reminderNote}`,
        data: workout,
      }
    },
  },
  {
    name: "list_workouts",
    tool: {
      type: "function",
      name: "list_workouts",
      description:
        "List Health workouts. monthOffset 0 is this month, -1 is last month. Optional status filter: planned, done, or all.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          monthOffset: { type: "number" },
          status: {
            type: "string",
            enum: ["planned", "done", "all"],
          },
          limit: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = listWorkoutsToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid list request.",
        }
      }

      const monthKey = resolveMonthKey(parsed.data.monthOffset)
      let workouts = await listWorkoutsForMonth(monthKey)
      if (parsed.data.status !== "all") {
        workouts = workouts.filter(
          (workout) => workout.status === parsed.data.status
        )
      }
      workouts = workouts.slice(0, parsed.data.limit)

      if (workouts.length === 0) {
        return {
          ok: true,
          summary: `No workouts in ${formatMonthLabel(monthKey)}.`,
          data: [],
        }
      }

      const lines = workouts.map(
        (workout) =>
          `${formatLoggedOn(workout.occurred_on)}: ${formatWorkoutTypeLabel(workout.workout_type)} "${workout.title}" (${formatWorkoutStatusLabel(workout.status)}, ${formatDuration(workout.duration_minutes)}, ${workout.id})`
      )

      return {
        ok: true,
        summary: `${formatMonthLabel(monthKey)} workouts:\n${lines.join("\n")}`,
        data: workouts,
      }
    },
  },
  {
    name: "update_workout_status",
    tool: {
      type: "function",
      name: "update_workout_status",
      description:
        "Mark a Health workout as planned or done by id. Use after listing workouts if the user completed one.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: {
            type: "string",
            enum: [...WORKOUT_STATUSES],
          },
        },
        required: ["id", "status"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = updateWorkoutStatusToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid status update.",
        }
      }

      const workout = await updateWorkoutStatus(parsed.data)
      return {
        ok: true,
        summary: `Marked "${workout.title}" as ${formatWorkoutStatusLabel(workout.status).toLowerCase()}.`,
        data: workout,
      }
    },
  },
  {
    name: "delete_workout",
    tool: {
      type: "function",
      name: "delete_workout",
      description: "Delete one Health workout by id.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = deleteWorkoutToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid workout id.",
        }
      }

      await deleteWorkout(parsed.data.id)
      return {
        ok: true,
        summary: "Deleted the workout.",
      }
    },
  },
  {
    name: "list_recent_health",
    tool: {
      type: "function",
      name: "list_recent_health",
      description:
        "List the most recent Health body metrics and workouts across months.",
      strict: false,
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const limit =
        typeof args.limit === "number" && Number.isFinite(args.limit)
          ? Math.min(20, Math.max(1, Math.round(args.limit)))
          : 5

      const [metrics, workouts] = await Promise.all([
        getRecentMetrics(limit),
        getRecentWorkouts(limit),
      ])

      return {
        ok: true,
        summary: `Recent metrics: ${metrics.length}. Recent workouts: ${workouts.length}.`,
        data: { metrics, workouts },
      }
    },
  },
]
