import { MEAL_TYPES, type Meal, type MealPlanWithMeals } from "@/apps/diet/types"
import {
  buildMealRemindAt,
  DEFAULT_MEAL_REMINDER_TIMES,
} from "@/apps/diet/utils/reminders"
import {
  formatCalendarDay,
  getWeekDates,
  isPastCalendarDay,
} from "@/apps/diet/utils/week"

const mealTypeOrder = Object.fromEntries(
  MEAL_TYPES.map((type, index) => [type, index])
) as Record<(typeof MEAL_TYPES)[number], number>

export type UpcomingMealItem = {
  meal: Meal
  dayLabel: string
  isoDate: string
}

const getMealOccursAt = (meal: Meal, weekStart: string): Date | null => {
  if (meal.remind_at) {
    const remindAt = new Date(meal.remind_at)
    if (!Number.isNaN(remindAt.getTime())) {
      return remindAt
    }
  }

  const defaultTime =
    DEFAULT_MEAL_REMINDER_TIMES[
      meal.meal_type as keyof typeof DEFAULT_MEAL_REMINDER_TIMES
    ] ?? "12:00"

  return buildMealRemindAt(weekStart, meal.day_of_week, defaultTime)
}

export const getUpcomingMeals = (
  plan: MealPlanWithMeals,
  limit = 4,
  now: Date = new Date()
): UpcomingMealItem[] => {
  const days = getWeekDates(plan.week_start)
  const today = formatCalendarDay(now)
  const nowMs = now.getTime()

  return plan.meals
    .flatMap((meal) => {
      const day = days.find((item) => item.dayOfWeek === meal.day_of_week)
      if (!day || isPastCalendarDay(day.isoDate, now)) {
        return []
      }

      const occursAt = getMealOccursAt(meal, plan.week_start)
      if (!occursAt || occursAt.getTime() <= nowMs) {
        return []
      }

      return [
        {
          meal,
          dayLabel: day.isoDate === today ? "Today" : day.label,
          isoDate: day.isoDate,
          occursAtMs: occursAt.getTime(),
        },
      ]
    })
    .sort((a, b) => {
      if (a.occursAtMs !== b.occursAtMs) {
        return a.occursAtMs - b.occursAtMs
      }

      if (a.isoDate !== b.isoDate) {
        return a.isoDate.localeCompare(b.isoDate)
      }

      const typeDiff =
        (mealTypeOrder[a.meal.meal_type] ?? 99) -
        (mealTypeOrder[b.meal.meal_type] ?? 99)
      if (typeDiff !== 0) {
        return typeDiff
      }

      return a.meal.sort_order - b.meal.sort_order
    })
    .slice(0, limit)
    .map(({ meal, dayLabel, isoDate }) => ({ meal, dayLabel, isoDate }))
}
