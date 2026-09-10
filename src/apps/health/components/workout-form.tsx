"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import { Bell, Pencil, Plus, Trash2 } from "lucide-react"
import {
  createWorkoutAction,
  deleteWorkoutAction,
  updateWorkoutAction,
  updateWorkoutStatusAction,
} from "@/apps/health/services/actions"
import type { HealthWorkout, WorkoutType } from "@/apps/health/types"
import { WORKOUT_TYPES } from "@/apps/health/types"
import {
  formatCalendarDay,
  formatLoggedOn,
} from "@/apps/health/utils/date"
import {
  formatDuration,
  formatWorkoutStatusLabel,
  formatWorkoutTypeLabel,
} from "@/apps/health/utils/health"
import {
  buildWorkoutRemindAt,
  formatReminderDistance,
  formatReminderTimeFromIso,
  getDefaultRemindTimeForDate,
} from "@/apps/health/utils/reminders"
import { ensurePushSubscription } from "@/platform/push/ensure-subscription"
import { useModalHistory } from "@/platform/hooks/use-modal-history"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"

type WorkoutEditorDialogProps = {
  workout?: HealthWorkout
  variant?: "create" | "edit"
}

export const WorkoutEditorDialog = ({
  workout,
  variant = "create",
}: WorkoutEditorDialogProps) => {
  const isEditing = variant === "edit" && Boolean(workout)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [workoutType, setWorkoutType] = useState<WorkoutType>(
    workout?.workout_type ?? WORKOUT_TYPES[0]
  )
  const [occurredOn, setOccurredOn] = useState(
    workout?.occurred_on ?? formatCalendarDay()
  )
  const [alreadyDone, setAlreadyDone] = useState(
    workout ? workout.status === "done" : false
  )
  const [remindEnabled, setRemindEnabled] = useState(
    workout ? Boolean(workout.remind_at) : true
  )
  const [remindTime, setRemindTime] = useState(
    workout
      ? formatReminderTimeFromIso(workout.remind_at)
      : getDefaultRemindTimeForDate(formatCalendarDay())
  )
  const [isPending, startTransition] = useTransition()
  const [pendingLabel, setPendingLabel] = useState("Saving...")
  const editorHistoryId = `health-workout-${workout?.id ?? "new"}`

  const remindAt = useMemo(() => {
    if (!remindEnabled || alreadyDone) return null
    return buildWorkoutRemindAt(occurredOn, remindTime)
  }, [remindEnabled, alreadyDone, occurredOn, remindTime])

  const remindLabel = remindAt ? formatReminderDistance(remindAt) : null

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      const nextDone = workout ? workout.status === "done" : false
      setWorkoutType(workout?.workout_type ?? WORKOUT_TYPES[0])
      setOccurredOn(workout?.occurred_on ?? formatCalendarDay())
      setAlreadyDone(nextDone)
      setRemindEnabled(nextDone ? false : workout ? Boolean(workout.remind_at) : true)
      setRemindTime(
        workout
          ? formatReminderTimeFromIso(workout.remind_at)
          : getDefaultRemindTimeForDate(formatCalendarDay())
      )
      setError("")
      setPendingLabel("Saving...")
    }
  }

  useModalHistory({
    open,
    onClose: () => handleOpenChange(false),
    id: editorHistoryId,
  })

  const handleRemindEnabledChange = async (checked: boolean) => {
    setError("")

    if (!checked) {
      setRemindEnabled(false)
      return
    }

    if (alreadyDone) {
      setRemindEnabled(false)
      setError("Reminders are only for planned workouts.")
      return
    }

    setPendingLabel("Enabling reminders...")
    startTransition(async () => {
      try {
        const pushResult = await ensurePushSubscription()
        if (pushResult.error) {
          setRemindEnabled(false)
          setError(pushResult.error)
          return
        }
        setRemindEnabled(true)
      } catch (enableError) {
        setRemindEnabled(false)
        setError(
          enableError instanceof Error
            ? enableError.message
            : "Failed to enable notifications."
        )
      } finally {
        setPendingLabel("Saving...")
      }
    })
  }

  const handleAlreadyDoneChange = (checked: boolean) => {
    setAlreadyDone(checked)
    if (checked) {
      setRemindEnabled(false)
    } else if (!isEditing) {
      setRemindEnabled(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEditing ? (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit workout"
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
            {isEditing ? "Edit workout" : "Log workout"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          action={(formData) => {
            startTransition(async () => {
              setError("")
              setPendingLabel("Saving...")
              formData.set("status", alreadyDone ? "done" : "planned")
              formData.set("occurredOn", occurredOn)

              if (remindEnabled && !alreadyDone) {
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

              const result = isEditing
                ? await updateWorkoutAction(formData)
                : await createWorkoutAction(formData)
              if (result.error) {
                setError(result.error)
                return
              }
              handleOpenChange(false)
            })
          }}
        >
          {isEditing && workout ? (
            <input type="hidden" name="id" value={workout.id} />
          ) : null}
          <input type="hidden" name="workoutType" value={workoutType} />
          <input
            type="hidden"
            name="status"
            value={alreadyDone ? "done" : "planned"}
          />

          <div className="grid gap-2">
            <Label htmlFor={`health-workout-title-${workout?.id ?? "new"}`}>
              Title
            </Label>
            <Input
              id={`health-workout-title-${workout?.id ?? "new"}`}
              name="title"
              required
              maxLength={160}
              defaultValue={workout?.title ?? ""}
              placeholder="Morning run, push day..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={workoutType}
                onValueChange={(value) => {
                  if (!value) return
                  setWorkoutType(value as WorkoutType)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatWorkoutTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor={`health-workout-duration-${workout?.id ?? "new"}`}
              >
                Minutes
              </Label>
              <Input
                id={`health-workout-duration-${workout?.id ?? "new"}`}
                name="durationMinutes"
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                max="1440"
                required
                defaultValue={workout?.duration_minutes ?? ""}
                placeholder="30"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`health-workout-date-${workout?.id ?? "new"}`}>
              Date
            </Label>
            <Input
              id={`health-workout-date-${workout?.id ?? "new"}`}
              name="occurredOn"
              type="date"
              required
              value={occurredOn}
              onChange={(event) => {
                const nextDate = event.target.value
                setOccurredOn(nextDate)
                if (!isEditing && remindEnabled && !alreadyDone) {
                  setRemindTime(getDefaultRemindTimeForDate(nextDate))
                }
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`health-workout-notes-${workout?.id ?? "new"}`}>
              Notes
            </Label>
            <Textarea
              id={`health-workout-notes-${workout?.id ?? "new"}`}
              name="notes"
              maxLength={500}
              rows={3}
              defaultValue={workout?.notes ?? ""}
              placeholder="Optional details"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alreadyDone}
              disabled={isPending}
              onChange={(event) =>
                handleAlreadyDoneChange(event.target.checked)
              }
              className="size-4 rounded border"
            />
            Already done
          </label>

          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/50 px-3 py-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remindEnabled && !alreadyDone}
                disabled={isPending || alreadyDone}
                onChange={(event) => {
                  void handleRemindEnabledChange(event.target.checked)
                }}
                className="size-4 rounded border"
              />
              Remind me
            </label>
            {remindEnabled && !alreadyDone ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`health-remind-time-${workout?.id ?? "new"}`}>
                  Reminder time
                </Label>
                <Input
                  id={`health-remind-time-${workout?.id ?? "new"}`}
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
                ? pendingLabel
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

type WorkoutCardProps = {
  workout: HealthWorkout
}

export const WorkoutCard = ({ workout }: WorkoutCardProps) => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [status, setStatus] = useState(workout.status)
  const isDone = status === "done"

  useEffect(() => {
    setStatus(workout.status)
  }, [workout.status])

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/70 px-3 py-2.5",
        isDone && "opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <label className="mt-0.5 flex shrink-0 items-center">
            <input
              type="checkbox"
              checked={isDone}
              disabled={isPending}
              aria-label={isDone ? "Mark as planned" : "Mark as done"}
              className="size-4 rounded border"
              onChange={(event) => {
                const previous = status
                const nextStatus = event.target.checked ? "done" : "planned"
                setStatus(nextStatus)
                const formData = new FormData()
                formData.set("id", workout.id)
                formData.set("status", nextStatus)
                startTransition(async () => {
                  setError("")
                  const result = await updateWorkoutStatusAction(formData)
                  if (result.error) {
                    setStatus(previous)
                    setError(result.error)
                  }
                })
              }}
            />
          </label>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                {formatWorkoutTypeLabel(workout.workout_type)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "font-normal",
                  isDone
                    ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                    : undefined
                )}
              >
                {formatWorkoutStatusLabel(status)}
              </Badge>
              {workout.remind_at && status === "planned" ? (
                <Badge variant="outline" className="gap-1 font-normal">
                  <Bell className="size-3" />
                  {formatDistanceToNow(new Date(workout.remind_at), {
                    addSuffix: true,
                  })}
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {formatLoggedOn(workout.occurred_on)}
              </span>
            </div>
            <p
              className={cn(
                "truncate text-sm font-medium",
                isDone && "text-muted-foreground line-through"
              )}
            >
              {workout.title}
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatDuration(workout.duration_minutes)}
            </p>
            {workout.notes ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {workout.notes}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <WorkoutEditorDialog workout={workout} variant="edit" />
          <form
            action={(formData) => {
              startTransition(async () => {
                setError("")
                const result = await deleteWorkoutAction(formData)
                if (result.error) {
                  setError(result.error)
                }
              })
            }}
          >
            <input type="hidden" name="id" value={workout.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Delete workout"
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
