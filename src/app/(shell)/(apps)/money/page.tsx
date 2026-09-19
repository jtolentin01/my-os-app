import { MoneyWorkspace } from "@/apps/money/components/money-workspace"
import { listDebts } from "@/apps/money/services/debts"
import { listTransactionsForMonth } from "@/apps/money/services/transactions"
import type {
  DebtSummary,
  MoneyDebt,
  MoneyTransaction,
  MonthSummary,
} from "@/apps/money/types"
import { DEFAULT_CURRENCY } from "@/apps/money/types"
import {
  summarizeDebts,
  summarizeTransactions,
} from "@/apps/money/utils/money"
import {
  formatMonthKey,
  isValidMonthParam,
} from "@/apps/money/utils/month"

type MoneyPageProps = {
  searchParams: Promise<{ month?: string; tab?: string }>
}

const MoneyPage = async ({ searchParams }: MoneyPageProps) => {
  const params = await searchParams
  const tab = params.tab === "debts" ? "debts" : "month"
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
  let debts: MoneyDebt[] = []
  let debtSummary: DebtSummary = {
    iOwe: 0,
    owedToMe: 0,
    openCount: 0,
    dueSoonCount: 0,
    currency: DEFAULT_CURRENCY,
  }
  let loadError = ""
  let debtsError = ""

  const [transactionsResult, debtsResult] = await Promise.allSettled([
    listTransactionsForMonth(monthKey),
    listDebts({ status: "all", withInstallments: true }),
  ])

  if (transactionsResult.status === "fulfilled") {
    transactions = transactionsResult.value
    summary = summarizeTransactions(transactions, DEFAULT_CURRENCY)
  } else {
    const error = transactionsResult.reason
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load your money data. Make sure the database migration has been applied."
  }

  if (debtsResult.status === "fulfilled") {
    debts = debtsResult.value
    debtSummary = summarizeDebts(debts, DEFAULT_CURRENCY)
  } else {
    const error = debtsResult.reason
    debtsError =
      error instanceof Error
        ? error.message
        : "Unable to load debts. Make sure the debts migration has been applied."
  }

  return (
    <MoneyWorkspace
      tab={tab}
      monthKey={monthKey}
      transactions={transactions}
      summary={summary}
      debts={debts}
      debtSummary={debtSummary}
      loadError={loadError || undefined}
      debtsError={debtsError || undefined}
    />
  )
}

export default MoneyPage
