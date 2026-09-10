import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getEnabledApps } from "@/platform/config/apps.registry"
import { getOrCreateMealPlan } from "@/apps/diet/services/meals"
import { getUpcomingMeals } from "@/apps/diet/utils/upcoming"
import { formatWeekRange } from "@/apps/diet/utils/week"
import {
  getLatestHeightCm,
  getLatestWeightKg,
} from "@/apps/health/services/metrics"
import { getRecentWorkouts } from "@/apps/health/services/workouts"
import {
  computeBmi,
  formatBmi,
  formatDuration,
  formatHeight,
  formatWeight,
  formatWorkoutStatusLabel,
  formatWorkoutTypeLabel,
} from "@/apps/health/utils/health"
import { formatLoggedOn } from "@/apps/health/utils/date"
import { MoneyOverviewBars } from "@/apps/money/components/money-overview-bars"
import {
  getDebtSummary,
  getDueSoonDebts,
} from "@/apps/money/services/debts"
import { listTransactionsForMonth } from "@/apps/money/services/transactions"
import type { DebtSummary, MonthSummary } from "@/apps/money/types"
import { DEFAULT_CURRENCY } from "@/apps/money/types"
import {
  formatCategoryLabel,
  formatMoney,
  summarizeTransactions,
} from "@/apps/money/utils/money"
import {
  formatDirectionLabel,
  formatScheduleLabel,
} from "@/apps/money/utils/debt"
import {
  formatMonthLabel,
  formatMonthKey,
  formatOccurredOn,
} from "@/apps/money/utils/month"
import { getRecentNotes } from "@/apps/notes/services/notes"
import { toPlainNoteText } from "@/apps/notes/utils/content"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DashboardGreeting } from "@/platform/components/dashboard-greeting"
import { UserAvatar } from "@/platform/profile/user-avatar"
import {
  getLatestReport,
  getLifeProfile,
} from "@/platform/life/services"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const emptyMonthSummary = (): MonthSummary => ({
  income: 0,
  expense: 0,
  net: 0,
  currency: DEFAULT_CURRENCY,
  count: 0,
})

const emptyDebtSummary = (): DebtSummary => ({
  iOwe: 0,
  owedToMe: 0,
  openCount: 0,
  dueSoonCount: 0,
  currency: DEFAULT_CURRENCY,
})

const DashboardPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user!.id)
    .maybeSingle()

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "there"

  let upcomingMeals: ReturnType<typeof getUpcomingMeals> = []
  let weekLabel = ""
  let recentNotes: Awaited<ReturnType<typeof getRecentNotes>> = []
  let recentTransactions: Awaited<
    ReturnType<typeof listTransactionsForMonth>
  > = []
  let dueSoonDebts: Awaited<ReturnType<typeof getDueSoonDebts>> = []
  let monthSummary = emptyMonthSummary()
  let debtSummary = emptyDebtSummary()
  let monthLabel = formatMonthLabel(formatMonthKey())
  let moneyLoaded = false
  let latestWeightKg: number | null = null
  let latestHeightCm: number | null = null
  let recentWorkouts: Awaited<ReturnType<typeof getRecentWorkouts>> = []
  let healthLoaded = false
  let lifeProfile: Awaited<ReturnType<typeof getLifeProfile>> = null
  let latestLifeReport: Awaited<ReturnType<typeof getLatestReport>> = null

  try {
    const plan = await getOrCreateMealPlan()
    upcomingMeals = getUpcomingMeals(plan, 4)
    weekLabel = formatWeekRange(plan.week_start)
  } catch {
    upcomingMeals = []
  }

  try {
    recentNotes = await getRecentNotes(3)
  } catch {
    recentNotes = []
  }

  try {
    const monthTransactions = await listTransactionsForMonth()
    monthSummary = summarizeTransactions(monthTransactions)
    recentTransactions = monthTransactions.slice(0, 3)
    monthLabel = formatMonthLabel(formatMonthKey())
    moneyLoaded = true
  } catch {
    recentTransactions = []
  }

  try {
    debtSummary = await getDebtSummary()
    moneyLoaded = true
  } catch {
    debtSummary = emptyDebtSummary()
  }

  try {
    dueSoonDebts = await getDueSoonDebts(3)
  } catch {
    dueSoonDebts = []
  }

  try {
    const [weight, height, workouts] = await Promise.all([
      getLatestWeightKg(),
      getLatestHeightCm(),
      getRecentWorkouts(3),
    ])
    latestWeightKg = weight
    latestHeightCm = height
    recentWorkouts = workouts
    healthLoaded = true
  } catch {
    recentWorkouts = []
  }

  try {
    ;[lifeProfile, latestLifeReport] = await Promise.all([
      getLifeProfile(),
      getLatestReport(),
    ])
  } catch {
    lifeProfile = null
    latestLifeReport = null
  }

  const apps = getEnabledApps()
  const overviewCurrency = monthSummary.currency || debtSummary.currency
  const latestBmi = computeBmi(latestWeightKg, latestHeightCm)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <DashboardGreeting
        displayName={displayName}
        description="This is your personal operating system. Chat and Call are your AI entrances. Diet, Notes, Money, and Health are available too."
        avatar={
          <UserAvatar
            avatarUrl={profile?.avatar_url}
            displayName={displayName}
            className="h-16 w-16 shrink-0 sm:h-20 sm:w-20"
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Life foundation</CardTitle>
          <CardDescription>
            {lifeProfile
              ? `Updated ${new Date(lifeProfile.generated_at).toLocaleDateString()}`
              : "AI portrait across health, diet, money, and notes"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {lifeProfile ? (
            <>
              <p className="text-sm">{lifeProfile.portrait_summary}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">
                  Health · {lifeProfile.health.status.replaceAll("_", " ")}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  Diet · {lifeProfile.diet.status.replaceAll("_", " ")}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  Money · {lifeProfile.money.status.replaceAll("_", " ")}
                </Badge>
              </div>
              {latestLifeReport ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  Latest report {latestLifeReport.period_start} to{" "}
                  {latestLifeReport.period_end}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No foundation yet. Generate one from Settings → Life reports.
            </p>
          )}
          <Link href="/reports" className={cn(buttonVariants(), "w-fit")}>
            Open reports
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming meals</CardTitle>
            <CardDescription>{weekLabel || "Current week"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {upcomingMeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming meals. Plan something for today or later.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingMeals.map(({ meal, dayLabel }) => (
                  <div
                    key={meal.id}
                    className="rounded-lg border border-border/70 bg-muted/70 px-3 py-2"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {dayLabel}
                      </span>
                      <Badge
                        variant="secondary"
                        className="capitalize bg-primary/10 text-primary"
                      >
                        {meal.meal_type}
                      </Badge>
                    </div>
                    <p className="truncate text-sm font-medium">{meal.title}</p>
                    {meal.notes ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {meal.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <Link href="/diet" className={cn(buttonVariants(), "w-fit")}>
              Open Diet
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent notes</CardTitle>
            <CardDescription>Your latest captured thoughts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notes yet. Capture an idea in Notes.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentNotes.map((note) => {
                  const preview = toPlainNoteText(note.content)
                  return (
                    <div
                      key={note.id}
                      className="rounded-lg border border-border/70 bg-muted/70 px-3 py-2"
                    >
                      <p className="truncate text-sm font-medium">{note.title}</p>
                      {preview ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {preview}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
            <Link href="/notes" className={cn(buttonVariants(), "w-fit")}>
              Open Notes
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Money overview</CardTitle>
            <CardDescription>
              {monthLabel}
              {debtSummary.openCount > 0
                ? ` · ${debtSummary.openCount} open debt${debtSummary.openCount === 1 ? "" : "s"}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {moneyLoaded ? (
              <MoneyOverviewBars
                income={monthSummary.income}
                expense={monthSummary.expense}
                iOwe={debtSummary.iOwe}
                owedToMe={debtSummary.owedToMe}
                currency={overviewCurrency}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Money data is unavailable. Make sure the Money migrations are
                applied.
              </p>
            )}
            <Link href="/money" className={cn(buttonVariants(), "w-fit")}>
              Open Money
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Money this month</CardTitle>
            <CardDescription>
              {monthSummary.count > 0
                ? `${monthLabel} · Net ${formatMoney(monthSummary.net, monthSummary.currency)}`
                : monthLabel}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions yet. Log income or an expense in Money.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentTransactions.map((transaction) => {
                  const isIncome = transaction.type === "income"
                  return (
                    <div
                      key={transaction.id}
                      className="rounded-lg border border-border/70 bg-muted/70 px-3 py-2"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "capitalize",
                            isIncome
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {transaction.type}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          {formatCategoryLabel(transaction.category)}
                        </Badge>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium">
                          {transaction.title}
                        </p>
                        <p
                          className={cn(
                            "shrink-0 text-sm font-semibold tabular-nums",
                            isIncome
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-foreground"
                          )}
                        >
                          {isIncome ? "+" : "-"}
                          {formatMoney(
                            transaction.amount,
                            transaction.currency
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <Link href="/money" className={cn(buttonVariants(), "w-fit")}>
              Open Money
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debts due soon</CardTitle>
            <CardDescription>Upcoming payments and collections</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {dueSoonDebts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming debt due dates. Add debts in Money.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {dueSoonDebts.map((debt) => (
                  <div
                    key={debt.id}
                    className="rounded-lg border border-border/70 bg-muted/70 px-3 py-2"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          debt.direction === "owed_to_me"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {formatDirectionLabel(debt.direction)}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        {formatScheduleLabel(debt.schedule)}
                      </Badge>
                      {debt.next_due_on ? (
                        <span className="text-xs text-muted-foreground">
                          {formatOccurredOn(debt.next_due_on)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {debt.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {debt.counterparty}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatMoney(debt.remaining_amount, debt.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/money?tab=debts"
              className={cn(buttonVariants(), "w-fit")}
            >
              Open Debts
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health snapshot</CardTitle>
            <CardDescription>
              {healthLoaded
                ? `BMI ${formatBmi(latestBmi)}`
                : "Body metrics and workouts"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!healthLoaded ? (
              <p className="text-sm text-muted-foreground">
                Health data is unavailable. Make sure the Health migration is
                applied.
              </p>
            ) : latestWeightKg == null &&
              latestHeightCm == null &&
              recentWorkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No health data yet. Log weight or a workout in Health.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/70 bg-muted/70 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Weight</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatWeight(latestWeightKg)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/70 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Height</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatHeight(latestHeightCm)}
                    </p>
                  </div>
                </div>
                {recentWorkouts.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {recentWorkouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="rounded-lg border border-border/70 bg-muted/70 px-3 py-2"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary"
                          >
                            {formatWorkoutTypeLabel(workout.workout_type)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal",
                              workout.status === "done"
                                ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                                : undefined
                            )}
                          >
                            {formatWorkoutStatusLabel(workout.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatLoggedOn(workout.occurred_on)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-medium">
                            {workout.title}
                          </p>
                          <p className="shrink-0 text-sm font-semibold tabular-nums">
                            {formatDuration(workout.duration_minutes)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
            <Link href="/health" className={cn(buttonVariants(), "w-fit")}>
              Open Health
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Installed apps</CardTitle>
            <CardDescription>Modules available in your My OS</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {apps.map((app) => {
              const Icon = app.icon
              return (
                <Link
                  key={app.id}
                  href={app.href}
                  className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/50 px-3 py-3 transition-colors hover:bg-muted"
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.description}</p>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
