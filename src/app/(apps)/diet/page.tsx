import Link from "next/link"
import { MenuWorkspace } from "@/apps/diet/components/menu-workspace"
import { WeeklyPlanner } from "@/apps/diet/components/weekly-planner"
import { listMenuItems } from "@/apps/diet/services/menu-items"
import { getOrCreateMealPlan } from "@/apps/diet/services/meals"
import { formatWeekStart, getWeekStart } from "@/apps/diet/utils/week"
import { parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type DietPageProps = {
  searchParams: Promise<{ week?: string; tab?: string }>
}

const isValidWeekParam = (value?: string) => {
  if (!value) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = parseISO(value)
  return !Number.isNaN(parsed.getTime())
}

const DietPage = async ({ searchParams }: DietPageProps) => {
  const params = await searchParams
  const tab = params.tab === "menu" ? "menu" : "week"
  const weekStart = isValidWeekParam(params.week)
    ? formatWeekStart(getWeekStart(parseISO(params.week!)))
    : formatWeekStart(getWeekStart())

  let plan
  let menuItems = [] as Awaited<ReturnType<typeof listMenuItems>>
  let errorMessage = ""

  try {
    ;[plan, menuItems] = await Promise.all([
      getOrCreateMealPlan(weekStart),
      listMenuItems(),
    ])
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to load your diet data. Make sure the database migration has been applied."
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Diet unavailable</CardTitle>
            <CardDescription>
              The diet tables may not be set up in Supabase yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Run the SQL in{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                supabase/migrations/202609050001_init_platform_and_diet.sql
              </code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                supabase/migrations/202609060002_menu_items.sql
              </code>{" "}
              in your Supabase SQL editor, then refresh this page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const weekHref = `/diet?tab=week&week=${weekStart}`
  const menuHref = `/diet?tab=menu&week=${weekStart}`

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Diet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a cookable menu with nutrition, then plan each day from it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={weekHref}
            className={cn(
              buttonVariants({ variant: tab === "week" ? "default" : "outline", size: "sm" })
            )}
          >
            This week
          </Link>
          <Link
            href={menuHref}
            className={cn(
              buttonVariants({ variant: tab === "menu" ? "default" : "outline", size: "sm" })
            )}
          >
            Menu
          </Link>
        </div>
      </div>

      {tab === "menu" ? (
        <MenuWorkspace items={menuItems} />
      ) : (
        <WeeklyPlanner plan={plan} menuItems={menuItems} />
      )}
    </div>
  )
}

export default DietPage
