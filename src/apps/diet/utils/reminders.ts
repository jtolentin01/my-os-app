import {
  addDays,
  formatDistanceStrict,
  isBefore,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
} from "date-fns"

export const DEFAULT_MEAL_REMINDER_TIMES = {
  breakfast: "08:00",
  lunch: "12:00",
  dinner: "18:00",
  snack: "15:00",
} as const

export const buildMealRemindAt = (
  weekStart: string,
  dayOfWeek: number,
  time: string
) => {
  const [hours, minutes] = time.split(":").map((value) => Number(value))
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  const dayDate = addDays(parseISO(weekStart), dayOfWeek)
  return setSeconds(setMinutes(setHours(dayDate, hours), minutes), 0)
}

export const formatReminderDistance = (remindAt: Date, now = new Date()) => {
  if (isBefore(remindAt, now)) {
    return "This time is in the past"
  }

  return `${formatDistanceStrict(remindAt, now)} from now`
}

export const formatReminderTimeLabel = (remindAt: string | null) => {
  if (!remindAt) return null
  const date = parseISO(remindAt)
  if (Number.isNaN(date.getTime())) return null
  return formatReminderDistance(date)
}
