"use client"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Meal, MenuItem } from "@/apps/diet/types"
import { NutritionFactsLine } from "@/apps/diet/components/nutrition-facts-line"
import { nutritionFromMeal } from "@/apps/diet/utils/nutrition"
import { hasRecipeContent, linesFromText } from "@/apps/diet/utils/recipe"

type MenuItemDetailDialogProps = {
  item: MenuItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  meal?: Meal | null
}

const RecipeSection = ({
  title,
  lines,
  ordered = false,
}: {
  title: string
  lines: string[]
  ordered?: boolean
}) => {
  if (lines.length === 0) return null

  const ListTag = ordered ? "ol" : "ul"

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>
      <ListTag
        className={
          ordered
            ? "list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground"
            : "list-disc space-y-1.5 pl-5 text-sm text-muted-foreground"
        }
      >
        {lines.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ListTag>
    </div>
  )
}

export const MenuItemDetailDialog = ({
  item,
  open,
  onOpenChange,
  meal = null,
}: MenuItemDetailDialogProps) => {
  if (!item && !meal) return null

  const dish = item ?? meal?.menu_item ?? null
  const title = meal?.title || dish?.name || "Meal"
  const nutrition = meal
    ? nutritionFromMeal(meal)
    : dish
      ? {
          calories: dish.calories,
          carbs_g: dish.carbs_g,
          protein_g: dish.protein_g,
          fat_g: dish.fat_g,
        }
      : null

  const ingredients = linesFromText(dish?.ingredients)
  const instructions = linesFromText(dish?.instructions)
  const notes = meal?.notes?.trim() || dish?.notes?.trim() || ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {meal ? (
              <Badge
                variant="secondary"
                className="capitalize bg-primary/10 text-primary"
              >
                {meal.meal_type}
              </Badge>
            ) : null}
            {dish?.category ? (
              <Badge variant="secondary" className="capitalize">
                {dish.category}
              </Badge>
            ) : null}
            {dish?.serving_label ? (
              <span className="text-sm text-muted-foreground">
                {dish.serving_label}
                {meal && meal.servings !== 1 ? ` · ×${meal.servings}` : ""}
              </span>
            ) : null}
          </div>

          {nutrition ? <NutritionFactsLine facts={nutrition} className="text-sm" /> : null}

          {notes ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Notes</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {notes}
              </p>
            </div>
          ) : null}

          <RecipeSection title="Ingredients" lines={ingredients} />
          <RecipeSection title="How to cook" lines={instructions} ordered />

          {!hasRecipeContent(dish ?? {}) && !notes ? (
            <p className="rounded-lg border border-dashed border-border/80 bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
              No recipe details yet. Edit the dish to add ingredients and cook
              steps, or use Fill with AI.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
