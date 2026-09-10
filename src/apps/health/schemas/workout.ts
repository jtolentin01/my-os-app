import { z } from "zod"
import { WORKOUT_STATUSES, WORKOUT_TYPES } from "@/apps/health/types"

export const createWorkoutSchema = z
  .object({
    workoutType: z.enum(WORKOUT_TYPES),
    title: z.string().trim().min(1, "Title is required").max(160),
    durationMinutes: z.coerce
      .number()
      .int("Duration must be a whole number")
      .positive("Duration must be greater than 0")
      .max(1440, "Duration cannot exceed 24 hours"),
    notes: z.string().trim().max(500).optional().nullable(),
    status: z.enum(WORKOUT_STATUSES).default("planned"),
    remindAt: z.string().datetime().optional().nullable(),
    occurredOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
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

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>

export const updateWorkoutSchema = z
  .object({
    id: z.string().uuid(),
    workoutType: z.enum(WORKOUT_TYPES),
    title: z.string().trim().min(1, "Title is required").max(160),
    durationMinutes: z.coerce
      .number()
      .int("Duration must be a whole number")
      .positive("Duration must be greater than 0")
      .max(1440, "Duration cannot exceed 24 hours"),
    notes: z.string().trim().max(500).optional().nullable(),
    status: z.enum(WORKOUT_STATUSES),
    remindAt: z.string().datetime().optional().nullable(),
    occurredOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
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

export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>

export const updateWorkoutStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(WORKOUT_STATUSES),
})

export type UpdateWorkoutStatusInput = z.infer<typeof updateWorkoutStatusSchema>
