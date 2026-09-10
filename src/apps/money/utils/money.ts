import type {
  DebtDirection,
  DebtSchedule,
  DebtStatus,
  DebtSummary,
  MoneyDebt,
  MoneyDebtInstallment,
  MoneyDebtPayment,
  MoneyTransaction,
  MonthSummary,
} from "@/apps/money/types"
import { DEFAULT_CURRENCY } from "@/apps/money/types"
import { isDueSoon } from "@/apps/money/utils/debt"

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

export const normalizeTransaction = (
  row: Record<string, unknown>
): MoneyTransaction => ({
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

const toDirection = (value: unknown): DebtDirection =>
  value === "owed_to_me" ? "owed_to_me" : "i_owe"

const toSchedule = (value: unknown): DebtSchedule => {
  if (
    value === "weekly" ||
    value === "monthly" ||
    value === "once" ||
    value === "custom"
  ) {
    return value
  }
  return "monthly"
}

const toStatus = (value: unknown): DebtStatus =>
  value === "paid" ? "paid" : "open"

export const normalizeDebt = (row: Record<string, unknown>): MoneyDebt => ({
  id: String(row.id),
  user_id: String(row.user_id),
  direction: toDirection(row.direction),
  counterparty: String(row.counterparty),
  title: String(row.title),
  original_amount: toAmountNumber(row.original_amount),
  remaining_amount: toAmountNumber(row.remaining_amount),
  currency: String(row.currency ?? DEFAULT_CURRENCY),
  schedule: toSchedule(row.schedule),
  installment_amount: toAmountNumber(row.installment_amount),
  next_due_on: row.next_due_on == null ? null : String(row.next_due_on),
  notes: row.notes == null ? null : String(row.notes),
  status: toStatus(row.status),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
})

export const normalizeDebtInstallment = (
  row: Record<string, unknown>
): MoneyDebtInstallment => ({
  id: String(row.id),
  user_id: String(row.user_id),
  debt_id: String(row.debt_id),
  due_on: String(row.due_on),
  amount: toAmountNumber(row.amount),
  paid_amount: toAmountNumber(row.paid_amount),
  status: toStatus(row.status),
  sort_order: Number(row.sort_order ?? 0),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
})

export const normalizeDebtPayment = (
  row: Record<string, unknown>
): MoneyDebtPayment => ({
  id: String(row.id),
  user_id: String(row.user_id),
  debt_id: String(row.debt_id),
  amount: toAmountNumber(row.amount),
  paid_on: String(row.paid_on),
  notes: row.notes == null ? null : String(row.notes),
  transaction_id:
    row.transaction_id == null ? null : String(row.transaction_id),
  created_at: String(row.created_at),
})

export const summarizeDebts = (
  debts: MoneyDebt[],
  currency: string = DEFAULT_CURRENCY
): DebtSummary => {
  let iOwe = 0
  let owedToMe = 0
  let openCount = 0
  let dueSoonCount = 0

  for (const debt of debts) {
    if (debt.status !== "open") continue
    openCount += 1
    if (debt.direction === "i_owe") {
      iOwe += debt.remaining_amount
    } else {
      owedToMe += debt.remaining_amount
    }
    if (isDueSoon(debt.next_due_on)) {
      dueSoonCount += 1
    }
  }

  return {
    iOwe: Math.round(iOwe * 100) / 100,
    owedToMe: Math.round(owedToMe * 100) / 100,
    openCount,
    dueSoonCount,
    currency,
  }
}
