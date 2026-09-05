"use client"

import { useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Bell, Plus, Trash2 } from "lucide-react"
import {
  createMealAction,
  deleteMealAction,
} from "@/apps/diet/services/actions"
import type { Meal, MealType, MenuItem } from "@/apps/diet/types"
import { MEAL_TYPES } from "@/apps/diet/types"
import {
  formatNutritionLine,
  nutritionFromMeal,
} from "@/apps/diet/utils/nutrition"
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

type MealCardProps = {
  meal: Meal
}

export const MealCard = ({ meal }: MealCardProps) => {
  const nutrition = nutritionFromMeal(meal)

  return (
    <div className="group flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/70 px-3 py-2.5">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="capitalize bg-primary/10 text-primary"
          >
            {meal.meal_type}
          </Badge>
          {meal.remind_at ? (
            <Badge variant="outline" className="gap-1 font-normal">
              <Bell className="size-3" />
              {formatDistanceToNow(new Date(meal.remind_at), { addSuffix: true })}
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-sm font-medium">{meal.title}</p>
        {nutrition ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatNutritionLine(nutrition)}
            {meal.servings !== 1 ? ` · ×${meal.servings}` : ""}
          </p>
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

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    setError("")

    const resolvedTitle = title.trim() || selectedMenuItem?.name || ""
    if (!resolvedTitle) {
      setIsPending(false)
      setError("Choose a menu dish or enter a title.")
      return
    }

    formData.set("mealType", mealType)
    formData.set("title", resolvedTitle)
    formData.set("menuItemId", menuItemId)
    formData.set("servings", servings || "1")

    if (remindEnabled) {
      if (!remindAt) {
        setIsPending(false)
        setError("Choose a valid reminder time.")
        return
      }

      if (remindAt.getTime() <= Date.now()) {
        setIsPending(false)
        setError("Reminder time must be in the future.")
        return
      }

      const pushResult = await ensurePushSubscription()
      if (pushResult.error) {
        setIsPending(false)
        setError(pushResult.error)
        return
      }

      formData.set("remindAt", remindAt.toISOString())
    } else {
      formData.set("remindAt", "")
    }

    const result = await createMealAction(formData)
    setIsPending(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    setOpen(false)
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
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="mealPlanId" value={mealPlanId} />
          <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
          <div className="flex flex-col gap-2">
            <Label>From menu</Label>
            <Select
              value={menuItemId || null}
              onValueChange={handleMenuSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a dish (optional)" />
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
              <p className="text-xs text-muted-foreground">
                {formatNutritionLine({
                  calories: selectedMenuItem.calories,
                  carbs_g: selectedMenuItem.carbs_g,
                  protein_g: selectedMenuItem.protein_g,
                  fat_g: selectedMenuItem.fat_g,
                })}{" "}
                · {selectedMenuItem.serving_label}
              </p>
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
                onChange={(event) => setRemindEnabled(event.target.checked)}
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
              {isPending ? "Saving..." : "Save meal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
