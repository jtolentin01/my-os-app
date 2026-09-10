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
  "debt",
  "other",
] as const

export const INCOME_CATEGORIES = [
  "salary",
  "freelance",
  "gift",
  "refund",
  "debt",
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

export const DEBT_DIRECTIONS = ["i_owe", "owed_to_me"] as const
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number]

export const DEBT_SCHEDULES = ["weekly", "monthly", "once", "custom"] as const
export type DebtSchedule = (typeof DEBT_SCHEDULES)[number]

export const DEBT_STATUSES = ["open", "paid"] as const
export type DebtStatus = (typeof DEBT_STATUSES)[number]

export type MoneyDebt = {
  id: string
  user_id: string
  direction: DebtDirection
  counterparty: string
  title: string
  original_amount: number
  remaining_amount: number
  currency: string
  schedule: DebtSchedule
  installment_amount: number
  next_due_on: string | null
  notes: string | null
  status: DebtStatus
  created_at: string
  updated_at: string
  installments?: MoneyDebtInstallment[]
}

export type MoneyDebtInstallment = {
  id: string
  user_id: string
  debt_id: string
  due_on: string
  amount: number
  paid_amount: number
  status: DebtStatus
  sort_order: number
  created_at: string
  updated_at: string
}

export type MoneyDebtPayment = {
  id: string
  user_id: string
  debt_id: string
  amount: number
  paid_on: string
  notes: string | null
  transaction_id: string | null
  created_at: string
}

export type DebtSummary = {
  iOwe: number
  owedToMe: number
  openCount: number
  dueSoonCount: number
  currency: string
}
