import { WeeklyPlanner } from "@/apps/diet/components/weekly-planner"
import { getOrCreateMealPlan } from "@/apps/diet/services/meals"
import { formatWeekStart, getWeekStart } from "@/apps/diet/utils/week"
import { parseISO } from "date-fns"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type DietPageProps = {
  searchParams: Promise<{ week?: string }>
}

const isValidWeekParam = (value?: string) => {
  if (!value) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = parseISO(value)
  return !Number.isNaN(parsed.getTime())
}

const DietPage = async ({ searchParams }: DietPageProps) => {
  const params = await searchParams
  const weekStart = isValidWeekParam(params.week)
    ? formatWeekStart(getWeekStart(parseISO(params.week!)))
    : formatWeekStart(getWeekStart())

  let plan
  let errorMessage = ""

  try {
    plan = await getOrCreateMealPlan(weekStart)
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to load your meal plan. Make sure the database migration has been applied."
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
              in your Supabase SQL editor, then refresh this page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <WeeklyPlanner plan={plan} />
    </div>
  )
}

export default DietPage
