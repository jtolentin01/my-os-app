export const TRANSACTION_TYPES = ["expense", "income"] as const

export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const EXPENSE_CATEGORIES = [
  "food",
  "transport",
  "housing",
  "utilities",
  "health",
  "entertainment",
  "shopping",
  "education",
  "subscriptions",
  "other",
] as const

export const INCOME_CATEGORIES = [
  "salary",
  "freelance",
  "gift",
  "refund",
  "other",
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]
export type TransactionCategory = ExpenseCategory | IncomeCategory

export const DEFAULT_CURRENCY = "PHP"

export type MoneyTransaction = {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  currency: string
  category: string
  title: string
  notes: string | null
  occurred_on: string
  created_at: string
  updated_at: string
}

export type MonthSummary = {
  income: number
  expense: number
  net: number
  currency: string
  count: number
}
