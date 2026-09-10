import { formatMoney } from "@/apps/money/utils/money"
import { DEFAULT_CURRENCY } from "@/apps/money/types"
import { cn } from "@/lib/utils"

export type MoneyOverviewBarsProps = {
  income: number
  expense: number
  iOwe: number
  owedToMe: number
  currency?: string
}

const rows = [
  {
    key: "income",
    label: "Income",
    tone: "bg-emerald-500/80 dark:bg-emerald-400/70",
  },
  {
    key: "expense",
    label: "Expenses",
    tone: "bg-primary/70",
  },
  {
    key: "iOwe",
    label: "I owe",
    tone: "bg-amber-500/80 dark:bg-amber-400/70",
  },
  {
    key: "owedToMe",
    label: "Owed to me",
    tone: "bg-sky-500/70 dark:bg-sky-400/60",
  },
] as const

export const MoneyOverviewBars = ({
  income,
  expense,
  iOwe,
  owedToMe,
  currency = DEFAULT_CURRENCY,
}: MoneyOverviewBarsProps) => {
  const values = {
    income: Math.max(0, income),
    expense: Math.max(0, expense),
    iOwe: Math.max(0, iOwe),
    owedToMe: Math.max(0, owedToMe),
  }
  const maxValue = Math.max(...Object.values(values), 0)
  const net = Math.round((income - expense) * 100) / 100
  const hasData = maxValue > 0

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground">
        No money activity yet. Log income, expenses, or debts to see the
        overview.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const amount = values[row.key]
          const widthPercent =
            maxValue > 0 ? Math.max((amount / maxValue) * 100, amount > 0 ? 4 : 0) : 0

          return (
            <div key={row.key} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {row.label}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatMoney(amount, currency)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width]", row.tone)}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <p
        className={cn(
          "text-sm font-medium tabular-nums",
          net >= 0
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-destructive"
        )}
      >
        Month net {formatMoney(net, currency)}
      </p>
    </div>
  )
}
