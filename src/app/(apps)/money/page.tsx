import { MoneyWorkspace } from "@/apps/money/components/money-workspace"
import { listTransactionsForMonth } from "@/apps/money/services/transactions"
import type { MoneyTransaction, MonthSummary } from "@/apps/money/types"
import { DEFAULT_CURRENCY } from "@/apps/money/types"
import { summarizeTransactions } from "@/apps/money/utils/money"
import {
  formatMonthKey,
  isValidMonthParam,
} from "@/apps/money/utils/month"

type MoneyPageProps = {
  searchParams: Promise<{ month?: string }>
}

const MoneyPage = async ({ searchParams }: MoneyPageProps) => {
  const params = await searchParams
  const monthKey = isValidMonthParam(params.month)
    ? params.month!
    : formatMonthKey()

  let transactions: MoneyTransaction[] = []
  let summary: MonthSummary = {
    income: 0,
    expense: 0,
    net: 0,
    currency: DEFAULT_CURRENCY,
    count: 0,
  }
  let loadError = ""

  try {
    transactions = await listTransactionsForMonth(monthKey)
    summary = summarizeTransactions(transactions, DEFAULT_CURRENCY)
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load your money data. Make sure the database migration has been applied."
  }

  return (
    <MoneyWorkspace
      monthKey={monthKey}
      transactions={transactions}
      summary={summary}
      loadError={loadError || undefined}
    />
  )
}

export default MoneyPage
