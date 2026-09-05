import { MEAL_TYPES, type Meal, type MealPlanWithMeals } from "@/apps/diet/types"
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

export const getUpcomingMeals = (
  plan: MealPlanWithMeals,
  limit = 4,
  now: Date = new Date()
): UpcomingMealItem[] => {
  const days = getWeekDates(plan.week_start)
  const today = formatCalendarDay(now)

  return plan.meals
    .flatMap((meal) => {
      const day = days.find((item) => item.dayOfWeek === meal.day_of_week)
      if (!day || isPastCalendarDay(day.isoDate, now)) {
        return []
      }

      return [
        {
          meal,
          dayLabel: day.isoDate === today ? "Today" : day.label,
          isoDate: day.isoDate,
        },
      ]
    })
    .sort((a, b) => {
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
}
