"use client"

import { useState, useTransition } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import {
  createBodyMetricAction,
  deleteBodyMetricAction,
  updateBodyMetricAction,
} from "@/apps/health/services/actions"
import type { BodyMetric } from "@/apps/health/types"
import {
  formatCalendarDay,
  formatLoggedOn,
} from "@/apps/health/utils/date"
import {
  formatHeight,
  formatWeight,
} from "@/apps/health/utils/health"
import { useModalHistory } from "@/platform/hooks/use-modal-history"
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

type MetricEditorDialogProps = {
  metric?: BodyMetric
  variant?: "create" | "edit"
}

export const MetricEditorDialog = ({
  metric,
  variant = "create",
}: MetricEditorDialogProps) => {
  const isEditing = variant === "edit" && Boolean(metric)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const editorHistoryId = `health-metric-${metric?.id ?? "new"}`

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) setError("")
  }

  useModalHistory({
    open,
    onClose: () => handleOpenChange(false),
    id: editorHistoryId,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEditing ? (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit metric"
            />
          }
        >
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button type="button" size="sm" />}>
          <Plus className="size-4" />
          Add
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit body metrics" : "Log body metrics"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          action={(formData) => {
            startTransition(async () => {
              setError("")
              const result = isEditing
                ? await updateBodyMetricAction(formData)
                : await createBodyMetricAction(formData)
              if (result.error) {
                setError(result.error)
                return
              }
              handleOpenChange(false)
            })
          }}
        >
          {isEditing && metric ? (
            <input type="hidden" name="id" value={metric.id} />
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`health-weight-${metric?.id ?? "new"}`}>
                Weight (kg)
              </Label>
              <Input
                id={`health-weight-${metric?.id ?? "new"}`}
                name="weightKg"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0.1"
                max="500"
                defaultValue={metric?.weight_kg ?? ""}
                placeholder="72.5"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`health-height-${metric?.id ?? "new"}`}>
                Height (cm)
              </Label>
              <Input
                id={`health-height-${metric?.id ?? "new"}`}
                name="heightCm"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0.1"
                max="300"
                defaultValue={metric?.height_cm ?? ""}
                placeholder="170"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`health-metric-date-${metric?.id ?? "new"}`}>
              Date
            </Label>
            <Input
              id={`health-metric-date-${metric?.id ?? "new"}`}
              name="loggedOn"
              type="date"
              required
              defaultValue={metric?.logged_on ?? formatCalendarDay()}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`health-metric-notes-${metric?.id ?? "new"}`}>
              Notes
            </Label>
            <Textarea
              id={`health-metric-notes-${metric?.id ?? "new"}`}
              name="notes"
              maxLength={500}
              rows={3}
              defaultValue={metric?.notes ?? ""}
              placeholder="Optional details"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Adding..."
                : isEditing
                  ? "Save"
                  : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type MetricCardProps = {
  metric: BodyMetric
}

export const MetricCard = ({ metric }: MetricCardProps) => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/70 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {formatLoggedOn(metric.logged_on)}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {metric.weight_kg != null ? (
              <p>
                <span className="text-muted-foreground">Weight </span>
                <span className="font-semibold tabular-nums">
                  {formatWeight(metric.weight_kg)}
                </span>
              </p>
            ) : null}
            {metric.height_cm != null ? (
              <p>
                <span className="text-muted-foreground">Height </span>
                <span className="font-semibold tabular-nums">
                  {formatHeight(metric.height_cm)}
                </span>
              </p>
            ) : null}
          </div>
          {metric.notes ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {metric.notes}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <MetricEditorDialog metric={metric} variant="edit" />
          <form
            action={(formData) => {
              startTransition(async () => {
                setError("")
                const result = await deleteBodyMetricAction(formData)
                if (result.error) {
                  setError(result.error)
                }
              })
            }}
          >
            <input type="hidden" name="id" value={metric.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Delete metric"
              disabled={isPending}
            >
              <Trash2 className="size-4" />
            </Button>
          </form>
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
