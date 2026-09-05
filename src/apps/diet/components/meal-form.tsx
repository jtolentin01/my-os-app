"use client"

import { useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Bell, Plus, Trash2 } from "lucide-react"
import {
  createMealAction,
  deleteMealAction,
} from "@/apps/diet/services/actions"
import type { Meal, MealType } from "@/apps/diet/types"
import { MEAL_TYPES } from "@/apps/diet/types"
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
  return (
    <div className="group flex items-start justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="capitalize">
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
        {meal.notes ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meal.notes}</p>
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
  defaultMealType?: MealType
}

export const AddMealDialog = ({
  mealPlanId,
  dayOfWeek,
  weekStart,
  defaultMealType = "breakfast",
}: AddMealDialogProps) => {
  const [open, setOpen] = useState(false)
  const [mealType, setMealType] = useState<MealType>(defaultMealType)
  const [remindEnabled, setRemindEnabled] = useState(false)
  const [remindTime, setRemindTime] = useState<string>(
    DEFAULT_MEAL_REMINDER_TIMES[defaultMealType]
  )
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!remindEnabled) {
      setRemindTime(DEFAULT_MEAL_REMINDER_TIMES[mealType])
    }
  }, [mealType, remindEnabled])

  const remindAt = useMemo(() => {
    if (!remindEnabled) return null
    return buildMealRemindAt(weekStart, dayOfWeek, remindTime)
  }, [remindEnabled, weekStart, dayOfWeek, remindTime])

  const remindLabel = remindAt ? formatReminderDistance(remindAt) : null

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setMealType(defaultMealType)
      setRemindEnabled(false)
      setRemindTime(DEFAULT_MEAL_REMINDER_TIMES[defaultMealType])
      setError("")
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    setError("")
    formData.set("mealType", mealType)

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
      <DialogTrigger render={<Button variant="outline" size="sm" className="w-full" />}>
        <Plus className="size-3.5" />
        Add meal
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add meal</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="mealPlanId" value={mealPlanId} />
          <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`title-${dayOfWeek}`}>Dish</Label>
            <Input
              id={`title-${dayOfWeek}`}
              name="title"
              placeholder="Grilled chicken with rice"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Meal type</Label>
            <Select
              value={mealType}
              onValueChange={(value) => {
                if (value) setMealType(value as MealType)
              }}
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
            <Label htmlFor={`notes-${dayOfWeek}`}>Notes</Label>
            <Textarea
              id={`notes-${dayOfWeek}`}
              name="notes"
              placeholder="Optional prep notes or portions"
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border px-3 py-3">
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
