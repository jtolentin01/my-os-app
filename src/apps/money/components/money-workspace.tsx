"use client"

import Link from "next/link"
import { DebtsWorkspace } from "@/apps/money/components/debts-workspace"
import {
  TransactionCard,
  TransactionEditorDialog,
} from "@/apps/money/components/transaction-form"
import type {
  DebtSummary,
  MoneyDebt,
  MoneyTransaction,
  MonthSummary,
} from "@/apps/money/types"
import { formatMoney } from "@/apps/money/utils/money"
import {
  formatMonthLabel,
  shiftMonthKey,
} from "@/apps/money/utils/month"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type MoneyWorkspaceProps = {
  tab: "month" | "debts"
  monthKey: string
  transactions: MoneyTransaction[]
  summary: MonthSummary
  debts: MoneyDebt[]
  debtSummary: DebtSummary
  loadError?: string
  debtsError?: string
}

export const MoneyWorkspace = ({
  tab,
  monthKey,
  transactions,
  summary,
  debts,
  debtSummary,
  loadError,
  debtsError,
}: MoneyWorkspaceProps) => {
  const prevMonth = shiftMonthKey(monthKey, -1)
  const nextMonth = shiftMonthKey(monthKey, 1)
  const monthHref = `/money?tab=month&month=${monthKey}`
  const debtsHref = `/money?tab=debts&month=${monthKey}`

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Money</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track spending and debts in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={monthHref}
            className={cn(
              buttonVariants({
                variant: tab === "month" ? "default" : "outline",
                size: "sm",
              })
            )}
          >
            This month
          </Link>
          <Link
            href={debtsHref}
            className={cn(
              buttonVariants({
                variant: tab === "debts" ? "default" : "outline",
                size: "sm",
              })
            )}
          >
            Debts
          </Link>
        </div>
      </div>

      {tab === "debts" ? (
        <DebtsWorkspace
          debts={debts}
          summary={debtSummary}
          loadError={debtsError}
        />
      ) : loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Money unavailable</CardTitle>
            <CardDescription>
              The money tables may not be set up in Supabase yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Run the SQL in{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                supabase/migrations/202609100001_money.sql
              </code>{" "}
              in your Supabase SQL editor, then refresh this page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/money?tab=month&month=${prevMonth}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Previous
              </Link>
              <span className="px-1 text-sm font-medium tabular-nums">
                {formatMonthLabel(monthKey)}
              </span>
              <Link
                href={`/money?tab=month&month=${nextMonth}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Next
              </Link>
            </div>
            <TransactionEditorDialog />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Income</CardDescription>
                <CardTitle className="text-emerald-700 dark:text-emerald-400">
                  {formatMoney(summary.income, summary.currency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Expenses</CardDescription>
                <CardTitle>
                  {formatMoney(summary.expense, summary.currency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Net</CardDescription>
                <CardTitle
                  className={cn(
                    summary.net >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-destructive"
                  )}
                >
                  {formatMoney(summary.net, summary.currency)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-card px-4 py-12 text-center">
              <p className="text-sm font-medium">No transactions this month</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add income or an expense to start tracking.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {transactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
