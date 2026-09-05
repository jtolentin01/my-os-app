import type { Meal, NutritionFacts } from "@/apps/diet/types"

export const emptyNutrition = (): NutritionFacts => ({
  calories: 0,
  carbs_g: 0,
  protein_g: 0,
  fat_g: 0,
})

export const scaleNutrition = (
  facts: NutritionFacts,
  servings: number
): NutritionFacts => ({
  calories: roundNutrition(facts.calories * servings),
  carbs_g: roundNutrition(facts.carbs_g * servings),
  protein_g: roundNutrition(facts.protein_g * servings),
  fat_g: roundNutrition(facts.fat_g * servings),
})

export const addNutrition = (
  left: NutritionFacts,
  right: NutritionFacts
): NutritionFacts => ({
  calories: roundNutrition(left.calories + right.calories),
  carbs_g: roundNutrition(left.carbs_g + right.carbs_g),
  protein_g: roundNutrition(left.protein_g + right.protein_g),
  fat_g: roundNutrition(left.fat_g + right.fat_g),
})

export const roundNutrition = (value: number) =>
  Math.round(Math.max(0, value) * 10) / 10

export const nutritionFromMeal = (meal: Meal): NutritionFacts | null => {
  if (!meal.menu_item) return null
  return scaleNutrition(
    {
      calories: Number(meal.menu_item.calories) || 0,
      carbs_g: Number(meal.menu_item.carbs_g) || 0,
      protein_g: Number(meal.menu_item.protein_g) || 0,
      fat_g: Number(meal.menu_item.fat_g) || 0,
    },
    Number(meal.servings) || 1
  )
}

export const sumMealNutrition = (meals: Meal[]): NutritionFacts =>
  meals.reduce((total, meal) => {
    const facts = nutritionFromMeal(meal)
    return facts ? addNutrition(total, facts) : total
  }, emptyNutrition())

export const formatNutritionLine = (facts: NutritionFacts) =>
  `${Math.round(facts.calories)} kcal · C ${formatGrams(facts.carbs_g)} · P ${formatGrams(facts.protein_g)} · F ${formatGrams(facts.fat_g)}`

const formatGrams = (value: number) =>
  `${Number.isInteger(value) ? value : value.toFixed(1)}g`
