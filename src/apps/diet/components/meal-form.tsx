"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import {
  createMealAction,
  deleteMealAction,
} from "@/apps/diet/services/actions"
import type { Meal, MealType } from "@/apps/diet/types"
import { MEAL_TYPES } from "@/apps/diet/types"
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
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {meal.meal_type}
          </Badge>
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
  defaultMealType?: MealType
}

export const AddMealDialog = ({
  mealPlanId,
  dayOfWeek,
  defaultMealType = "breakfast",
}: AddMealDialogProps) => {
  const [open, setOpen] = useState(false)
  const [mealType, setMealType] = useState<MealType>(defaultMealType)
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    setError("")
    formData.set("mealType", mealType)
    const result = await createMealAction(formData)
    setIsPending(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
