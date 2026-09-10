import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  parse,
} from "date-fns"
import type { DebtSchedule } from "@/apps/money/types"
import { formatCalendarDay } from "@/apps/money/utils/month"

const parseCalendarDate = (isoDate: string) =>
  parse(isoDate, "yyyy-MM-dd", new Date())

export const daysUntilDue = (
  nextDueOn: string,
  today: string = formatCalendarDay()
) => {
  const start = parseCalendarDate(today)
  const due = parseCalendarDate(nextDueOn)
  if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) {
    return null
  }
  return differenceInCalendarDays(due, start)
}

export const clearedDueReminderFields = () => ({
  due_reminder_7d_for: null,
  due_reminder_3d_for: null,
  due_reminder_1d_for: null,
  due_reminder_due_for: null,
})

export const advanceDueDate = (
  schedule: DebtSchedule,
  fromDate: string
): string | null => {
  const base = parseCalendarDate(fromDate)
  if (Number.isNaN(base.getTime())) return null

  if (schedule === "weekly") {
    return format(addDays(base, 7), "yyyy-MM-dd")
  }

  if (schedule === "monthly") {
    return format(addMonths(base, 1), "yyyy-MM-dd")
  }

  return null
}

export const resolveInitialNextDue = (
  schedule: DebtSchedule,
  nextDueOn?: string | null
) => {
  if (nextDueOn && /^\d{4}-\d{2}-\d{2}$/.test(nextDueOn)) {
    return nextDueOn
  }
  return formatCalendarDay()
}

export const formatScheduleLabel = (schedule: DebtSchedule) => {
  switch (schedule) {
    case "weekly":
      return "Weekly"
    case "monthly":
      return "Monthly"
    case "once":
      return "One-time"
    case "custom":
      return "Specific dates"
  }
}

export const nextOpenInstallmentDue = (
  installments: Array<{ due_on: string; status: string }>
) => {
  const open = installments
    .filter((item) => item.status === "open")
    .sort((a, b) => a.due_on.localeCompare(b.due_on))
  return open[0]?.due_on ?? null
}

export const nextOpenInstallmentAmount = (
  installments: Array<{
    amount: number
    paid_amount: number
    status: string
    due_on: string
  }>
) => {
  const open = installments
    .filter((item) => item.status === "open")
    .sort((a, b) => a.due_on.localeCompare(b.due_on))
  const first = open[0]
  if (!first) return 0
  return Math.round((first.amount - first.paid_amount) * 100) / 100
}

export const formatDirectionLabel = (direction: "i_owe" | "owed_to_me") =>
  direction === "i_owe" ? "I owe" : "Owed to me"

export const isDueSoon = (
  nextDueOn: string | null,
  withinDays = 7,
  today: string = formatCalendarDay()
) => {
  if (!nextDueOn) return false
  const start = parseCalendarDate(today)
  const due = parseCalendarDate(nextDueOn)
  if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) return false
  const limit = addDays(start, withinDays)
  return due <= limit
}

export const isOverdue = (
  nextDueOn: string | null,
  today: string = formatCalendarDay()
) => {
  if (!nextDueOn) return false
  return nextDueOn < today
}
