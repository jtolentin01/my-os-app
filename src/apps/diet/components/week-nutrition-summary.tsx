import type { MealPlanWithMeals } from "@/apps/diet/types"
import {
  formatNutritionLine,
  sumMealNutrition,
} from "@/apps/diet/utils/nutrition"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type WeekNutritionSummaryProps = {
  plan: MealPlanWithMeals
}

export const WeekNutritionSummary = ({ plan }: WeekNutritionSummaryProps) => {
  const linkedMeals = plan.meals.filter((meal) => meal.menu_item)
  const totals = sumMealNutrition(plan.meals)

  if (plan.meals.length === 0) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Week nutrition</CardTitle>
        <CardDescription>
          {linkedMeals.length === 0
            ? "Add meals from your Menu to include nutrition totals."
            : `${linkedMeals.length} of ${plan.meals.length} meals linked to menu dishes.`}
        </CardDescription>
      </CardHeader>
      {linkedMeals.length > 0 ? (
        <CardContent>
          <p className="text-sm font-medium">{formatNutritionLine(totals)}</p>
        </CardContent>
      ) : null}
    </Card>
  )
}
