import { z } from "zod"
import {
  DEBT_DIRECTIONS,
  DEBT_SCHEDULES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_TYPES,
} from "@/apps/money/types"
import {
  createDebt,
  deleteDebt,
  getDebtById,
  getDebtSummary,
  listDebts,
  recordDebtPayment,
} from "@/apps/money/services/debts"
import {
  createTransaction,
  deleteTransaction,
  getMonthSummary,
  listTransactionsForMonth,
} from "@/apps/money/services/transactions"
import {
  formatDirectionLabel,
  formatScheduleLabel,
} from "@/apps/money/utils/debt"
import {
  formatCategoryLabel,
  formatMoney,
} from "@/apps/money/utils/money"
import {
  formatCalendarDay,
  formatMonthKey,
  formatMonthLabel,
  isValidMonthParam,
  shiftMonthKey,
} from "@/apps/money/utils/month"
import type { AiToolDefinition } from "@/platform/ai/tools/types"

const allCategories = [
  ...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]),
] as [string, ...string[]]

const createTransactionToolSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amount: z.number().positive().max(1_000_000_000),
    category: z.enum(allCategories),
    title: z.string().trim().min(1).max(160),
    notes: z.string().trim().max(500).nullable().optional().default(null),
    occurredOn: z.string().trim().max(32).optional().default(""),
  })
  .superRefine((value, ctx) => {
    const allowed =
      value.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
    if (!(allowed as readonly string[]).includes(value.category)) {
      ctx.addIssue({
        code: "custom",
        path: ["category"],
        message: "Invalid category for this transaction type.",
      })
    }
    if (
      value.occurredOn &&
      !/^\d{4}-\d{2}-\d{2}$/.test(value.occurredOn)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["occurredOn"],
        message: "Date must be YYYY-MM-DD.",
      })
    }
  })

const listTransactionsToolSchema = z.object({
  query: z.string().trim().max(200).optional().default(""),
  type: z.enum(["expense", "income", "all"]).optional().default("all"),
  monthOffset: z.number().int().min(-24).max(24).optional().default(0),
  limit: z.number().int().min(1).max(40).optional().default(20),
})

const getMonthSummaryToolSchema = z.object({
  monthOffset: z.number().int().min(-24).max(24).optional().default(0),
})

const deleteTransactionToolSchema = z.object({
  id: z.string().uuid(),
})

const createDebtToolSchema = z
  .object({
    direction: z.enum(DEBT_DIRECTIONS),
    counterparty: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(160),
    originalAmount: z.number().positive().max(1_000_000_000).nullable().optional().default(null),
    schedule: z.enum(DEBT_SCHEDULES),
    installmentAmount: z
      .number()
      .positive()
      .max(1_000_000_000)
      .nullable()
      .optional()
      .default(null),
    nextDueOn: z.string().trim().max(32).optional().default(""),
    installments: z
      .array(
        z.object({
          dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          amount: z.number().positive().max(1_000_000_000),
        })
      )
      .optional()
      .default([]),
    notes: z.string().trim().max(500).nullable().optional().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.nextDueOn && !/^\d{4}-\d{2}-\d{2}$/.test(value.nextDueOn)) {
      ctx.addIssue({
        code: "custom",
        path: ["nextDueOn"],
        message: "Date must be YYYY-MM-DD.",
      })
    }
    if (value.schedule === "custom") {
      if (!value.installments || value.installments.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["installments"],
          message: "Add at least one specific due date for custom debts.",
        })
      }
      return
    }
    if (value.originalAmount == null || value.originalAmount <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["originalAmount"],
        message: "Amount is required.",
      })
      return
    }
    if (value.schedule === "once" && !value.nextDueOn) {
      ctx.addIssue({
        code: "custom",
        path: ["nextDueOn"],
        message: "A due date is required for one-time debts.",
      })
    }
    if (
      value.installmentAmount != null &&
      value.installmentAmount > value.originalAmount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["installmentAmount"],
        message: "Installment cannot be greater than the total amount.",
      })
    }
  })

const listDebtsToolSchema = z.object({
  status: z.enum(["open", "paid", "all"]).optional().default("open"),
  limit: z.number().int().min(1).max(40).optional().default(20),
})

const recordDebtPaymentToolSchema = z.object({
  debtId: z.string().uuid(),
  amount: z.number().positive().max(1_000_000_000),
  paidOn: z.string().trim().max(32).optional().default(""),
  notes: z.string().trim().max(500).nullable().optional().default(null),
  logTransaction: z.boolean().optional().default(true),
})

const deleteDebtToolSchema = z.object({
  id: z.string().uuid(),
})

const resolveMonthKey = (monthOffset: number) =>
  shiftMonthKey(formatMonthKey(), monthOffset)

export const moneyTools: AiToolDefinition[] = [
  {
    name: "log_transaction",
    tool: {
      type: "function",
      name: "log_transaction",
      description:
        "Log an income or expense in Money. Amounts are in PHP. Expense categories: food, transport, housing, utilities, health, entertainment, shopping, education, subscriptions, debt, other. Income categories: salary, freelance, gift, refund, debt, other. occurredOn is YYYY-MM-DD; use today if unknown.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: [...TRANSACTION_TYPES] },
          amount: { type: "number" },
          category: { type: "string", enum: allCategories },
          title: { type: "string" },
          notes: { type: ["string", "null"] },
          occurredOn: { type: "string" },
        },
        required: [
          "type",
          "amount",
          "category",
          "title",
          "notes",
          "occurredOn",
        ],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = createTransactionToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary:
            parsed.error.issues[0]?.message ?? "Invalid transaction payload.",
        }
      }

      const occurredOn =
        parsed.data.occurredOn &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.data.occurredOn)
          ? parsed.data.occurredOn
          : formatCalendarDay()

      const transaction = await createTransaction({
        type: parsed.data.type,
        amount: parsed.data.amount,
        category: parsed.data.category,
        title: parsed.data.title,
        notes: parsed.data.notes,
        occurredOn,
      })

      return {
        ok: true,
        summary: `Logged ${transaction.type} "${transaction.title}" for ${formatMoney(transaction.amount)} (${formatCategoryLabel(transaction.category)}).`,
        data: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          title: transaction.title,
          occurred_on: transaction.occurred_on,
        },
      }
    },
  },
  {
    name: "list_transactions",
    tool: {
      type: "function",
      name: "list_transactions",
      description:
        "List Money transactions. Use monthOffset 0 for this month, -1 for last month. Empty query lists the month. Optional type filter: expense, income, or all.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          type: { type: "string", enum: ["expense", "income", "all"] },
          monthOffset: { type: "number" },
          limit: { type: "number" },
        },
        required: ["query", "type", "monthOffset", "limit"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = listTransactionsToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary:
            parsed.error.issues[0]?.message ?? "Invalid list request.",
        }
      }

      const monthKey = resolveMonthKey(parsed.data.monthOffset)
      const typeFilter =
        parsed.data.type === "all" ? undefined : parsed.data.type
      const query = parsed.data.query.trim().toLowerCase()

      const transactions = (await listTransactionsForMonth(monthKey))
        .filter((item) => (typeFilter ? item.type === typeFilter : true))
        .filter((item) => {
          if (!query) return true
          return (
            item.title.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query) ||
            (item.notes ?? "").toLowerCase().includes(query)
          )
        })
        .slice(0, parsed.data.limit)

      const limited = transactions.map((item) => ({
        id: item.id,
        type: item.type,
        amount: item.amount,
        category: item.category,
        title: item.title,
        notes: item.notes,
        occurred_on: item.occurred_on,
      }))

      return {
        ok: true,
        summary: `Found ${limited.length} transactions for ${formatMonthLabel(monthKey)}.`,
        data: limited,
      }
    },
  },
  {
    name: "get_month_summary",
    tool: {
      type: "function",
      name: "get_month_summary",
      description:
        "Get income, expenses, and net for a month in Money. monthOffset 0 is this month, -1 is last month.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          monthOffset: { type: "number" },
        },
        required: ["monthOffset"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = getMonthSummaryToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary:
            parsed.error.issues[0]?.message ?? "Invalid summary request.",
        }
      }

      const monthKey = resolveMonthKey(parsed.data.monthOffset)
      if (!isValidMonthParam(monthKey)) {
        return { ok: false, summary: "Invalid month." }
      }

      const summary = await getMonthSummary(monthKey)

      return {
        ok: true,
        summary: `${formatMonthLabel(monthKey)}: income ${formatMoney(summary.income)}, expenses ${formatMoney(summary.expense)}, net ${formatMoney(summary.net)} (${summary.count} transactions).`,
        data: {
          month: monthKey,
          ...summary,
        },
      }
    },
  },
  {
    name: "delete_transaction",
    tool: {
      type: "function",
      name: "delete_transaction",
      description: "Delete one Money transaction by id.",
      strict: true,
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
      const parsed = deleteTransactionToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary:
            parsed.error.issues[0]?.message ?? "Invalid transaction id.",
        }
      }

      await deleteTransaction(parsed.data.id)

      return {
        ok: true,
        summary: "Deleted the transaction.",
        data: { id: parsed.data.id },
      }
    },
  },
  {
    name: "log_debt",
    tool: {
      type: "function",
      name: "log_debt",
      description:
        "Create a debt in Money. direction i_owe or owed_to_me. schedule: weekly, monthly, once (single due date), or custom (multiple specific dates via installments). For custom, set installments to [{dueOn, amount}, ...] and originalAmount can be null. Amounts are PHP. nextDueOn is YYYY-MM-DD and required for once.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          direction: { type: "string", enum: [...DEBT_DIRECTIONS] },
          counterparty: { type: "string" },
          title: { type: "string" },
          originalAmount: { type: ["number", "null"] },
          schedule: { type: "string", enum: [...DEBT_SCHEDULES] },
          installmentAmount: { type: ["number", "null"] },
          nextDueOn: { type: "string" },
          installments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                dueOn: { type: "string" },
                amount: { type: "number" },
              },
              required: ["dueOn", "amount"],
              additionalProperties: false,
            },
          },
          notes: { type: ["string", "null"] },
        },
        required: [
          "direction",
          "counterparty",
          "title",
          "originalAmount",
          "schedule",
          "installmentAmount",
          "nextDueOn",
          "installments",
          "notes",
        ],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = createDebtToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid debt payload.",
        }
      }

      const nextDueOn =
        parsed.data.nextDueOn &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.data.nextDueOn)
          ? parsed.data.nextDueOn
          : formatCalendarDay()

      const debt = await createDebt({
        direction: parsed.data.direction,
        counterparty: parsed.data.counterparty,
        title: parsed.data.title,
        originalAmount: parsed.data.originalAmount ?? undefined,
        schedule: parsed.data.schedule,
        installmentAmount: parsed.data.installmentAmount ?? undefined,
        nextDueOn,
        installments: parsed.data.installments,
        notes: parsed.data.notes,
      })

      return {
        ok: true,
        summary: `Logged debt "${debt.title}" (${formatDirectionLabel(debt.direction)} ${debt.counterparty}) for ${formatMoney(debt.original_amount)}, ${formatScheduleLabel(debt.schedule)}.`,
        data: {
          id: debt.id,
          direction: debt.direction,
          counterparty: debt.counterparty,
          remaining_amount: debt.remaining_amount,
          schedule: debt.schedule,
          next_due_on: debt.next_due_on,
          installments: debt.installments?.map((item) => ({
            due_on: item.due_on,
            amount: item.amount,
            status: item.status,
          })),
        },
      }
    },
  },
  {
    name: "list_debts",
    tool: {
      type: "function",
      name: "list_debts",
      description:
        "List Money debts. status open (default), paid, or all. Sorted by next due date.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "paid", "all"] },
          limit: { type: "number" },
        },
        required: ["status", "limit"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = listDebtsToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid debts request.",
        }
      }

      const debts = (await listDebts({ status: parsed.data.status })).slice(
        0,
        parsed.data.limit
      )

      return {
        ok: true,
        summary: `Found ${debts.length} debts.`,
        data: debts.map((debt) => ({
          id: debt.id,
          direction: debt.direction,
          counterparty: debt.counterparty,
          title: debt.title,
          remaining_amount: debt.remaining_amount,
          original_amount: debt.original_amount,
          schedule: debt.schedule,
          installment_amount: debt.installment_amount,
          next_due_on: debt.next_due_on,
          status: debt.status,
        })),
      }
    },
  },
  {
    name: "get_debt_summary",
    tool: {
      type: "function",
      name: "get_debt_summary",
      description:
        "Get open debt totals: how much the user owes, how much is owed to them, and how many are due soon.",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    execute: async () => {
      const summary = await getDebtSummary()
      return {
        ok: true,
        summary: `Open debts: you owe ${formatMoney(summary.iOwe)}, owed to you ${formatMoney(summary.owedToMe)}, ${summary.dueSoonCount} due soon (${summary.openCount} open).`,
        data: summary,
      }
    },
  },
  {
    name: "record_debt_payment",
    tool: {
      type: "function",
      name: "record_debt_payment",
      description:
        "Record a payment on a Money debt by debtId. Reduces remaining balance, advances next due for weekly/monthly schedules, and by default also logs a Money transaction (expense if i_owe, income if owed_to_me).",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          debtId: { type: "string" },
          amount: { type: "number" },
          paidOn: { type: "string" },
          notes: { type: ["string", "null"] },
          logTransaction: { type: "boolean" },
        },
        required: ["debtId", "amount", "paidOn", "notes", "logTransaction"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = recordDebtPaymentToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary:
            parsed.error.issues[0]?.message ?? "Invalid payment payload.",
        }
      }

      const paidOn =
        parsed.data.paidOn && /^\d{4}-\d{2}-\d{2}$/.test(parsed.data.paidOn)
          ? parsed.data.paidOn
          : formatCalendarDay()

      const before = await getDebtById(parsed.data.debtId)
      if (!before) {
        return { ok: false, summary: "Debt not found." }
      }

      const result = await recordDebtPayment({
        debtId: parsed.data.debtId,
        amount: parsed.data.amount,
        paidOn,
        notes: parsed.data.notes,
        logTransaction: parsed.data.logTransaction,
      })

      return {
        ok: true,
        summary: `Recorded ${formatMoney(result.payment.amount)} payment on "${before.title}". Remaining ${formatMoney(result.debt.remaining_amount)}${result.debt.status === "paid" ? " (paid off)" : ""}.`,
        data: {
          debt: {
            id: result.debt.id,
            remaining_amount: result.debt.remaining_amount,
            status: result.debt.status,
            next_due_on: result.debt.next_due_on,
          },
          payment: {
            id: result.payment.id,
            amount: result.payment.amount,
            paid_on: result.payment.paid_on,
          },
        },
      }
    },
  },
  {
    name: "delete_debt",
    tool: {
      type: "function",
      name: "delete_debt",
      description: "Delete one Money debt by id, including its payment history.",
      strict: true,
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
      const parsed = deleteDebtToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid debt id.",
        }
      }

      await deleteDebt(parsed.data.id)
      return {
        ok: true,
        summary: "Deleted the debt.",
        data: { id: parsed.data.id },
      }
    },
  },
]
