import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AddMealDialog, MealCard } from "@/apps/diet/components/meal-form"
import { WeekNutritionSummary } from "@/apps/diet/components/week-nutrition-summary"
import type { MealPlanWithMeals, MenuItem } from "@/apps/diet/types"
import {
  formatWeekRange,
  getWeekDates,
  isPastCalendarDay,
  shiftWeekStart,
} from "@/apps/diet/utils/week"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type WeeklyPlannerProps = {
  plan: MealPlanWithMeals
  menuItems: MenuItem[]
}

export const WeeklyPlanner = ({ plan, menuItems }: WeeklyPlannerProps) => {
  const days = getWeekDates(plan.week_start)
  const previousWeek = shiftWeekStart(plan.week_start, -1)
  const nextWeek = shiftWeekStart(plan.week_start, 1)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">This week</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick dishes from your menu and track nutrition across the week.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/diet?tab=week&week=${previousWeek}`}
            aria-label="Previous week"
            className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
          >
            <ChevronLeft className="size-4" />
          </Link>
          <div className="min-w-40 text-center text-sm font-medium">
            {formatWeekRange(plan.week_start)}
          </div>
          <Link
            href={`/diet?tab=week&week=${nextWeek}`}
            aria-label="Next week"
            className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <WeekNutritionSummary plan={plan} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {days.map((day) => {
          const dayMeals = plan.meals.filter(
            (meal) => meal.day_of_week === day.dayOfWeek
          )
          const isPast = isPastCalendarDay(day.isoDate)

          return (
            <Card
              key={day.isoDate}
              size="sm"
              className={cn(isPast && "opacity-80")}
            >
              <CardHeader>
                <CardTitle className="flex items-baseline justify-between gap-2">
                  <span>{day.fullLabel}</span>
                  <span className="text-muted-foreground">{day.dayNumber}</span>
                </CardTitle>
                <CardDescription>
                  {isPast
                    ? dayMeals.length === 0
                      ? "Past day"
                      : `${dayMeals.length} meal${dayMeals.length === 1 ? "" : "s"} · past`
                    : dayMeals.length === 0
                      ? "No meals yet"
                      : `${dayMeals.length} meal${dayMeals.length === 1 ? "" : "s"}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {dayMeals.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {dayMeals.map((meal) => (
                      <MealCard key={meal.id} meal={meal} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border/80 bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground">
                    {isPast
                      ? "This day has passed."
                      : "Add breakfast, lunch, or dinner for this day."}
                  </p>
                )}
                {!isPast ? (
                  <AddMealDialog
                    mealPlanId={plan.id}
                    dayOfWeek={day.dayOfWeek}
                    weekStart={plan.week_start}
                    menuItems={menuItems}
                  />
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
