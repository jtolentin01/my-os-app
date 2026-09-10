"use client"

import { useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Bell, Plus, Trash2 } from "lucide-react"
import { MenuItemDetailDialog } from "@/apps/diet/components/menu-item-detail-dialog"
import {
  createMealAction,
  deleteMealAction,
} from "@/apps/diet/services/actions"
import type { Meal, MealType, MenuItem } from "@/apps/diet/types"
import { MEAL_TYPES } from "@/apps/diet/types"
import { NutritionFactsLine } from "@/apps/diet/components/nutrition-facts-line"
import { nutritionFromMeal } from "@/apps/diet/utils/nutrition"
import { hasRecipeContent } from "@/apps/diet/utils/recipe"
import {
  buildMealRemindAt,
  DEFAULT_MEAL_REMINDER_TIMES,
  formatReminderDistance,
} from "@/apps/diet/utils/reminders"
import { ensurePushSubscription } from "@/platform/push/ensure-subscription"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type MealCardProps = {
  meal: Meal
  highlighted?: boolean
}

export const MealCard = ({ meal, highlighted = false }: MealCardProps) => {
  const [detailOpen, setDetailOpen] = useState(false)
  const nutrition = nutritionFromMeal(meal)
  const dish = meal.menu_item ?? null

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "group flex cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors",
          highlighted
            ? "border-primary/50 bg-primary/10 ring-1 ring-primary/25 hover:bg-primary/15"
            : "border-border/70 bg-muted/70 hover:bg-muted"
        )}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            setDetailOpen(true)
          }
        }}
      >
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="capitalize bg-primary/10 text-primary"
            >
              {meal.meal_type}
            </Badge>
            {highlighted ? (
              <Badge variant="outline" className="border-primary/40 font-normal text-primary">
                Up next
              </Badge>
            ) : null}
            {meal.remind_at ? (
              <Badge variant="outline" className="gap-1 font-normal">
                <Bell className="size-3" />
                {formatDistanceToNow(new Date(meal.remind_at), {
                  addSuffix: true,
                })}
              </Badge>
            ) : null}
            {dish && hasRecipeContent(dish) ? (
              <Badge variant="outline" className="font-normal">
                Recipe
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-sm font-medium">{meal.title}</p>
          {nutrition ? (
            <NutritionFactsLine
              facts={nutrition}
              className="mt-1"
              suffix={meal.servings !== 1 ? `×${meal.servings}` : undefined}
            />
          ) : null}
          {meal.notes ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {meal.notes}
            </p>
          ) : null}
        </div>
        <form
          action={async (formData) => {
            await deleteMealAction(formData)
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <input type="hidden" name="id" value={meal.id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            className="opacity-70 transition-opacity group-hover:opacity-100"
            aria-label="Delete meal"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </form>
      </div>

      <MenuItemDetailDialog
        item={dish}
        meal={meal}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}

type AddMealDialogProps = {
  mealPlanId: string
  dayOfWeek: number
  weekStart: string
  menuItems: MenuItem[]
  defaultMealType?: MealType
}

export const AddMealDialog = ({
  mealPlanId,
  dayOfWeek,
  weekStart,
  menuItems,
  defaultMealType = "breakfast",
}: AddMealDialogProps) => {
  const [open, setOpen] = useState(false)
  const [mealType, setMealType] = useState<MealType>(defaultMealType)
  const [menuItemId, setMenuItemId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [servings, setServings] = useState("1")
  const [remindEnabled, setRemindEnabled] = useState(false)
  const [remindTime, setRemindTime] = useState<string>(
    DEFAULT_MEAL_REMINDER_TIMES[defaultMealType]
  )
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [pendingLabel, setPendingLabel] = useState("Saving...")

  const selectedMenuItem = useMemo(
    () => menuItems.find((item) => item.id === menuItemId) ?? null,
    [menuItems, menuItemId]
  )

  const remindAt = useMemo(() => {
    if (!remindEnabled) return null
    return buildMealRemindAt(weekStart, dayOfWeek, remindTime)
  }, [remindEnabled, weekStart, dayOfWeek, remindTime])

  const remindLabel = remindAt ? formatReminderDistance(remindAt) : null

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setMealType(defaultMealType)
      setMenuItemId("")
      setTitle("")
      setServings("1")
      setRemindEnabled(false)
      setRemindTime(DEFAULT_MEAL_REMINDER_TIMES[defaultMealType])
      setError("")
      setIsPending(false)
      setPendingLabel("Saving...")
    }
  }

  const handleMealTypeChange = (value: string | null) => {
    if (!value) return
    const nextType = value as MealType
    setMealType(nextType)
    if (!remindEnabled) {
      setRemindTime(DEFAULT_MEAL_REMINDER_TIMES[nextType])
    }
  }

  const handleMenuSelect = (value: string | null) => {
    const nextId = value ?? ""
    setMenuItemId(nextId)
    if (!nextId) return
    const item = menuItems.find((entry) => entry.id === nextId)
    if (item) {
      setTitle(item.name)
    }
  }

  const handleRemindEnabledChange = async (checked: boolean) => {
    setError("")

    if (!checked) {
      setRemindEnabled(false)
      return
    }

    setPendingLabel("Enabling reminders...")
    setIsPending(true)
    try {
      const pushResult = await ensurePushSubscription()
      if (pushResult.error) {
        setRemindEnabled(false)
        setError(pushResult.error)
        return
      }
      setRemindEnabled(true)
    } catch (error) {
      setRemindEnabled(false)
      setError(
        error instanceof Error
          ? error.message
          : "Failed to enable notifications."
      )
    } finally {
      setIsPending(false)
      setPendingLabel("Saving...")
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setPendingLabel("Saving...")
    setIsPending(true)
    setError("")

    try {
      const resolvedTitle = title.trim() || selectedMenuItem?.name || ""
      if (!resolvedTitle) {
        setError("Choose a menu dish or enter a title.")
        return
      }

      formData.set("mealType", mealType)
      formData.set("title", resolvedTitle)
      formData.set("menuItemId", menuItemId)
      formData.set("servings", servings || "1")

      if (remindEnabled) {
        if (!remindAt) {
          setError("Choose a valid reminder time.")
          return
        }

        if (remindAt.getTime() <= Date.now()) {
          setError("Reminder time must be in the future.")
          return
        }

        const pushResult = await ensurePushSubscription()
        if (pushResult.error) {
          setError(pushResult.error)
          return
        }

        formData.set("remindAt", remindAt.toISOString())
      } else {
        formData.set("remindAt", "")
      }

      const result = await createMealAction(formData)

      if (result?.error) {
        setError(result.error)
        return
      }

      setOpen(false)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save meal."
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="w-full border-primary/30 text-primary hover:bg-primary/10"
          />
        }
      >
        <Plus className="size-3.5" />
        Add meal
      </DialogTrigger>
      <DialogContent className="max-h-[min(92dvh,720px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add meal</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit(new FormData(event.currentTarget))
          }}
        >
          <input type="hidden" name="mealPlanId" value={mealPlanId} />
          <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
          <div className="flex flex-col gap-2">
            <Label>From menu</Label>
            <Select
              value={menuItemId || null}
              onValueChange={handleMenuSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a dish (optional)">
                  {selectedMenuItem?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {menuItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMenuItem ? (
              <NutritionFactsLine
                facts={{
                  calories: selectedMenuItem.calories,
                  carbs_g: selectedMenuItem.carbs_g,
                  protein_g: selectedMenuItem.protein_g,
                  fat_g: selectedMenuItem.fat_g,
                }}
                suffix={selectedMenuItem.serving_label}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Prefer picking from Menu so weekly nutrition can be calculated.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`title-${dayOfWeek}`}>Dish</Label>
            <Input
              id={`title-${dayOfWeek}`}
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Grilled chicken with rice"
              required={!menuItemId}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Meal type</Label>
              <Select
                value={mealType}
                onValueChange={handleMealTypeChange}
              >
                <SelectTrigger className="w-full capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`servings-${dayOfWeek}`}>Servings</Label>
              <Input
                id={`servings-${dayOfWeek}`}
                name="servings"
                type="number"
                min="0.25"
                max="20"
                step="0.25"
                value={servings}
                onChange={(event) => setServings(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`notes-${dayOfWeek}`}>Notes</Label>
            <Textarea
              id={`notes-${dayOfWeek}`}
              name="notes"
              placeholder="Optional prep notes or portions"
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/50 px-3 py-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remindEnabled}
                disabled={isPending}
                onChange={(event) => {
                  void handleRemindEnabledChange(event.target.checked)
                }}
                className="size-4 rounded border"
              />
              Remind me
            </label>
            {remindEnabled ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`remind-time-${dayOfWeek}`}>Reminder time</Label>
                <Input
                  id={`remind-time-${dayOfWeek}`}
                  type="time"
                  value={remindTime}
                  onChange={(event) => setRemindTime(event.target.value)}
                  required
                />
                {remindLabel ? (
                  <p className="text-xs text-muted-foreground">{remindLabel}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? pendingLabel : "Save meal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
