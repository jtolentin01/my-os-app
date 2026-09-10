import type { MoneyTransaction, MonthSummary } from "@/apps/money/types"
import { DEFAULT_CURRENCY } from "@/apps/money/types"

export const toAmountNumber = (value: unknown) => {
  const amount = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100) / 100
}

export const formatMoney = (
  amount: number,
  currency: string = DEFAULT_CURRENCY
) => {
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export const formatCategoryLabel = (category: string) =>
  category
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

export const summarizeTransactions = (
  transactions: MoneyTransaction[],
  currency: string = DEFAULT_CURRENCY
): MonthSummary => {
  let income = 0
  let expense = 0

  for (const item of transactions) {
    if (item.type === "income") {
      income += item.amount
    } else {
      expense += item.amount
    }
  }

  income = Math.round(income * 100) / 100
  expense = Math.round(expense * 100) / 100

  return {
    income,
    expense,
    net: Math.round((income - expense) * 100) / 100,
    currency,
    count: transactions.length,
  }
}

export const normalizeTransaction = (row: Record<string, unknown>): MoneyTransaction => ({
  id: String(row.id),
  user_id: String(row.user_id),
  type: row.type === "income" ? "income" : "expense",
  amount: toAmountNumber(row.amount),
  currency: String(row.currency ?? DEFAULT_CURRENCY),
  category: String(row.category),
  title: String(row.title),
  notes: row.notes == null ? null : String(row.notes),
  occurred_on: String(row.occurred_on),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
})
