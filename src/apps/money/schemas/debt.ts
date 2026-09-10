import { z } from "zod"
import {
  DEBT_DIRECTIONS,
  DEBT_SCHEDULES,
} from "@/apps/money/types"

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")

const installmentItemSchema = z.object({
  dueOn: dateSchema,
  amount: z.coerce
    .number()
    .positive("Installment amount must be greater than 0")
    .max(1_000_000_000),
})

export const createDebtSchema = z
  .object({
    direction: z.enum(DEBT_DIRECTIONS),
    counterparty: z.string().trim().min(1, "Person or label is required").max(120),
    title: z.string().trim().min(1, "Title is required").max(160),
    originalAmount: z.coerce
      .number()
      .positive("Amount must be greater than 0")
      .max(1_000_000_000)
      .optional(),
    schedule: z.enum(DEBT_SCHEDULES),
    installmentAmount: z.coerce
      .number()
      .positive("Installment must be greater than 0")
      .max(1_000_000_000)
      .optional(),
    nextDueOn: dateSchema.optional().nullable(),
    installments: z.array(installmentItemSchema).optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.schedule === "custom") {
      if (!value.installments || value.installments.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["installments"],
          message: "Add at least one specific due date.",
        })
        return
      }
      const total = value.installments.reduce(
        (sum, item) => sum + item.amount,
        0
      )
      if (total <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["installments"],
          message: "Installment amounts must add up to more than 0.",
        })
      }
      return
    }

    if (!value.originalAmount) {
      ctx.addIssue({
        code: "custom",
        path: ["originalAmount"],
        message: "Amount is required.",
      })
      return
    }

    const installment = value.installmentAmount ?? value.originalAmount
    if (installment > value.originalAmount) {
      ctx.addIssue({
        code: "custom",
        path: ["installmentAmount"],
        message: "Installment cannot be greater than the total amount.",
      })
    }
    if (value.schedule === "once" && !value.nextDueOn) {
      ctx.addIssue({
        code: "custom",
        path: ["nextDueOn"],
        message: "A due date is required for one-time debts.",
      })
    }
  })

export type CreateDebtInput = z.infer<typeof createDebtSchema>

export const updateDebtSchema = z
  .object({
    id: z.string().uuid(),
    direction: z.enum(DEBT_DIRECTIONS),
    counterparty: z.string().trim().min(1, "Person or label is required").max(120),
    title: z.string().trim().min(1, "Title is required").max(160),
    schedule: z.enum(DEBT_SCHEDULES),
    installmentAmount: z.coerce
      .number()
      .positive("Installment must be greater than 0")
      .max(1_000_000_000)
      .optional(),
    nextDueOn: dateSchema.optional().nullable(),
    installments: z.array(installmentItemSchema).optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.schedule === "custom") {
      if (!value.installments || value.installments.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["installments"],
          message: "Add at least one specific due date.",
        })
      }
      return
    }

    if (!value.installmentAmount) {
      ctx.addIssue({
        code: "custom",
        path: ["installmentAmount"],
        message: "Installment is required.",
      })
    }
    if (value.schedule === "once" && !value.nextDueOn) {
      ctx.addIssue({
        code: "custom",
        path: ["nextDueOn"],
        message: "A due date is required for one-time debts.",
      })
    }
  })

export type UpdateDebtInput = z.infer<typeof updateDebtSchema>

export const recordDebtPaymentSchema = z.object({
  debtId: z.string().uuid(),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .max(1_000_000_000),
  paidOn: dateSchema,
  notes: z.string().trim().max(500).optional().nullable(),
  logTransaction: z.coerce.boolean().optional().default(true),
})

export type RecordDebtPaymentInput = z.infer<typeof recordDebtPaymentSchema>
