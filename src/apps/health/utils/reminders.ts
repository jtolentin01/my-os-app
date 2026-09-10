import {
  formatDistanceStrict,
  isBefore,
  parse,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
} from "date-fns"

export const DEFAULT_WORKOUT_REMINDER_TIME = "07:00"

export const buildWorkoutRemindAt = (occurredOn: string, time: string) => {
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
    return null
  }

  const dayDate = parse(occurredOn, "yyyy-MM-dd", new Date())
  if (Number.isNaN(dayDate.getTime())) {
    return null
  }

  return setSeconds(setMinutes(setHours(dayDate, hours), minutes), 0)
}

export const formatReminderDistance = (remindAt: Date, now = new Date()) => {
  if (isBefore(remindAt, now)) {
    return "This time is in the past"
  }

  return `${formatDistanceStrict(remindAt, now)} from now`
}

export const formatReminderTimeFromIso = (remindAt: string | null) => {
  if (!remindAt) return DEFAULT_WORKOUT_REMINDER_TIME
  const date = parseISO(remindAt)
  if (Number.isNaN(date.getTime())) return DEFAULT_WORKOUT_REMINDER_TIME
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export const getDefaultRemindTimeForDate = (occurredOn: string) => {
  const preferred = buildWorkoutRemindAt(
    occurredOn,
    DEFAULT_WORKOUT_REMINDER_TIME
  )
  if (preferred && preferred.getTime() > Date.now()) {
    return DEFAULT_WORKOUT_REMINDER_TIME
  }

  const later = new Date(Date.now() + 60 * 60 * 1000)
  return `${String(later.getHours()).padStart(2, "0")}:${String(later.getMinutes()).padStart(2, "0")}`
}

