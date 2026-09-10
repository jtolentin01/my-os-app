import { z } from "zod"
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_TYPES,
} from "@/apps/money/types"

const categorySchema = z.string().trim().min(1).max(40)

const refineCategory = (
  value: { type: "expense" | "income"; category: string },
  ctx: z.RefinementCtx
) => {
  const allowed =
    value.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  if (!(allowed as readonly string[]).includes(value.category)) {
    ctx.addIssue({
      code: "custom",
      path: ["category"],
      message: "Invalid category for this transaction type.",
    })
  }
}

export const createTransactionSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amount: z.coerce
      .number()
      .positive("Amount must be greater than 0")
      .max(1_000_000_000),
    category: categorySchema,
    title: z.string().trim().min(1, "Title is required").max(160),
    notes: z.string().trim().max(500).optional().nullable(),
    occurredOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  })
  .superRefine(refineCategory)

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>

export const updateTransactionSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(TRANSACTION_TYPES),
    amount: z.coerce
      .number()
      .positive("Amount must be greater than 0")
      .max(1_000_000_000),
    category: categorySchema,
    title: z.string().trim().min(1, "Title is required").max(160),
    notes: z.string().trim().max(500).optional().nullable(),
    occurredOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  })
  .superRefine(refineCategory)

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
