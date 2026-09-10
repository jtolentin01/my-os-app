import { z } from "zod"

const optionalPositive = (max: number, message: string) =>
  z.preprocess((value) => {
    if (value == null || value === "") return null
    return value
  }, z.union([z.null(), z.coerce.number().positive(message).max(max)]))

export const createBodyMetricSchema = z
  .object({
    weightKg: optionalPositive(500, "Weight must be greater than 0"),
    heightCm: optionalPositive(300, "Height must be greater than 0"),
    notes: z.string().trim().max(500).optional().nullable(),
    loggedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
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

export type CreateBodyMetricInput = z.infer<typeof createBodyMetricSchema>

export const updateBodyMetricSchema = z
  .object({
    id: z.string().uuid(),
    weightKg: optionalPositive(500, "Weight must be greater than 0"),
    heightCm: optionalPositive(300, "Height must be greater than 0"),
    notes: z.string().trim().max(500).optional().nullable(),
    loggedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
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

export type UpdateBodyMetricInput = z.infer<typeof updateBodyMetricSchema>
