import { z } from "zod"
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_TYPES,
} from "@/apps/money/types"
import {
  createTransaction,
  deleteTransaction,
  getMonthSummary,
  listTransactionsForMonth,
} from "@/apps/money/services/transactions"
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

const resolveMonthKey = (monthOffset: number) =>
  shiftMonthKey(formatMonthKey(), monthOffset)

export const moneyTools: AiToolDefinition[] = [
  {
    name: "log_transaction",
    tool: {
      type: "function",
      name: "log_transaction",
      description:
        "Log an income or expense in Money. Amounts are in PHP. Expense categories: food, transport, housing, utilities, health, entertainment, shopping, education, subscriptions, other. Income categories: salary, freelance, gift, refund, other. occurredOn is YYYY-MM-DD; use today if unknown.",
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
]
