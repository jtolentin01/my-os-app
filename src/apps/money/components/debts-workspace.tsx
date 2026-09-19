"use client"

import {
  DebtCard,
  DebtEditorDialog,
} from "@/apps/money/components/debt-form"
import type { DebtSummary, MoneyDebt } from "@/apps/money/types"
import { formatMoney } from "@/apps/money/utils/money"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PaginationControls } from "@/platform/components/pagination-controls"
import { cn } from "@/lib/utils"

type DebtsWorkspaceProps = {
  openDebts: MoneyDebt[]
  paidDebts: MoneyDebt[]
  paidPage: number
  paidTotalPages: number
  monthKey: string
  summary: DebtSummary
  loadError?: string
}

export const DebtsWorkspace = ({
  openDebts,
  paidDebts,
  paidPage,
  paidTotalPages,
  monthKey,
  summary,
  loadError,
}: DebtsWorkspaceProps) => {
  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debts unavailable</CardTitle>
          <CardDescription>
            The debt tables may not be set up in Supabase yet.
          </CardDescription>
        </CardHeader>
        <div className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Run the SQL in{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              supabase/migrations/202609100002_money_debts.sql
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              supabase/migrations/202609100003_money_debt_installments.sql
            </code>{" "}
            in your Supabase SQL editor, then refresh this page.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid w-full gap-3 sm:grid-cols-3 sm:flex-1">
          <Card size="sm">
            <CardHeader>
              <CardDescription>I owe</CardDescription>
              <CardTitle className="text-primary">
                {formatMoney(summary.iOwe, summary.currency)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Owed to me</CardDescription>
              <CardTitle className="text-emerald-700 dark:text-emerald-400">
                {formatMoney(summary.owedToMe, summary.currency)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Due soon</CardDescription>
              <CardTitle
                className={cn(
                  summary.dueSoonCount > 0 ? "text-primary" : undefined
                )}
              >
                {summary.dueSoonCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        <DebtEditorDialog />
      </div>

      {openDebts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card px-4 py-12 text-center">
          <p className="text-sm font-medium">No open debts</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Track what you owe or what others owe you.
          </p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-3">
          {openDebts.map((debt) => (
            <DebtCard key={debt.id} debt={debt} />
          ))}
        </div>
      )}

      {paidDebts.length > 0 || paidTotalPages > 1 ? (
        <div className="grid min-w-0 gap-3">
          <p className="text-sm font-medium text-muted-foreground">Paid</p>
          {paidDebts.map((debt) => (
            <DebtCard key={debt.id} debt={debt} />
          ))}
          <PaginationControls
            page={paidPage}
            totalPages={paidTotalPages}
            hrefForPage={(nextPage) => {
              const qs = new URLSearchParams({
                tab: "debts",
                month: monthKey,
              })
              if (nextPage > 1) qs.set("page", String(nextPage))
              return `/money?${qs.toString()}`
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
