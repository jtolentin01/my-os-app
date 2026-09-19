import { MoneyWorkspace } from "@/apps/money/components/money-workspace"
import { listDebts, listDebtsPage } from "@/apps/money/services/debts"
import {
  getMonthSummary,
  listTransactionsForMonthPage,
} from "@/apps/money/services/transactions"
import type {
  DebtSummary,
  MoneyDebt,
  MoneyTransaction,
  MonthSummary,
} from "@/apps/money/types"
import { DEFAULT_CURRENCY } from "@/apps/money/types"
import { summarizeDebts } from "@/apps/money/utils/money"
import {
  formatMonthKey,
  isValidMonthParam,
} from "@/apps/money/utils/month"
import { parsePageParam } from "@/lib/pagination"
import { redirect } from "next/navigation"

type MoneyPageProps = {
  searchParams: Promise<{ month?: string; tab?: string; page?: string }>
}

const MoneyPage = async ({ searchParams }: MoneyPageProps) => {
  const params = await searchParams
  const tab = params.tab === "debts" ? "debts" : "month"
  const monthKey = isValidMonthParam(params.month)
    ? params.month!
    : formatMonthKey()
  const page = parsePageParam(params.page)

  let transactions: MoneyTransaction[] = []
  let transactionsPage = 1
  let transactionsTotalPages = 1
  let summary: MonthSummary = {
    income: 0,
    expense: 0,
    net: 0,
    currency: DEFAULT_CURRENCY,
    count: 0,
  }
  let openDebts: MoneyDebt[] = []
  let paidDebts: MoneyDebt[] = []
  let paidPage = 1
  let paidTotalPages = 1
  let debtSummary: DebtSummary = {
    iOwe: 0,
    owedToMe: 0,
    openCount: 0,
    dueSoonCount: 0,
    currency: DEFAULT_CURRENCY,
  }
  let loadError = ""
  let debtsError = ""

  if (tab === "debts") {
    const [openResult, paidResult] = await Promise.allSettled([
      listDebts({ status: "open", withInstallments: true }),
      listDebtsPage({ status: "paid", page, withInstallments: true }),
    ])

    if (openResult.status === "fulfilled") {
      openDebts = openResult.value
      debtSummary = summarizeDebts(openDebts, DEFAULT_CURRENCY)
    } else {
      const error = openResult.reason
      debtsError =
        error instanceof Error
          ? error.message
          : "Unable to load debts. Make sure the debts migration has been applied."
    }

    if (paidResult.status === "fulfilled") {
      paidDebts = paidResult.value.items
      paidPage = paidResult.value.page
      paidTotalPages = paidResult.value.totalPages
      if (page > paidResult.value.totalPages && paidResult.value.total > 0) {
        redirect(`/money?tab=debts&month=${monthKey}&page=${paidResult.value.totalPages}`)
      }
    } else if (!debtsError) {
      const error = paidResult.reason
      debtsError =
        error instanceof Error
          ? error.message
          : "Unable to load debts. Make sure the debts migration has been applied."
    }
  } else {
    const [summaryResult, transactionsResult] = await Promise.allSettled([
      getMonthSummary(monthKey),
      listTransactionsForMonthPage(monthKey, page),
    ])

    if (summaryResult.status === "fulfilled") {
      summary = summaryResult.value
    }

    if (transactionsResult.status === "fulfilled") {
      transactions = transactionsResult.value.items
      transactionsPage = transactionsResult.value.page
      transactionsTotalPages = transactionsResult.value.totalPages
      if (
        page > transactionsResult.value.totalPages &&
        transactionsResult.value.total > 0
      ) {
        redirect(
          `/money?tab=month&month=${monthKey}&page=${transactionsResult.value.totalPages}`
        )
      }
    } else {
      const error = transactionsResult.reason
      loadError =
        error instanceof Error
          ? error.message
          : "Unable to load your money data. Make sure the database migration has been applied."
    }

    if (summaryResult.status === "rejected" && !loadError) {
      const error = summaryResult.reason
      loadError =
        error instanceof Error
          ? error.message
          : "Unable to load your money data. Make sure the database migration has been applied."
    }
  }

  return (
    <MoneyWorkspace
      tab={tab}
      monthKey={monthKey}
      transactions={transactions}
      transactionsPage={transactionsPage}
      transactionsTotalPages={transactionsTotalPages}
      summary={summary}
      openDebts={openDebts}
      paidDebts={paidDebts}
      paidPage={paidPage}
      paidTotalPages={paidTotalPages}
      debtSummary={debtSummary}
      loadError={loadError || undefined}
      debtsError={debtsError || undefined}
    />
  )
}

export default MoneyPage
