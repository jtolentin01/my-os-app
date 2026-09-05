import {
  addDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns"

export const getWeekStart = (date: Date = new Date()) =>
  startOfWeek(date, { weekStartsOn: 1 })

export const formatWeekStart = (date: Date) => format(date, "yyyy-MM-dd")

export const formatCalendarDay = (date: Date = new Date()) =>
  format(date, "yyyy-MM-dd")

export const getDayIsoDate = (weekStart: string, dayOfWeek: number) =>
  format(addDays(parseISO(weekStart), dayOfWeek), "yyyy-MM-dd")

export const isPastCalendarDay = (isoDate: string, now: Date = new Date()) =>
  isoDate < formatCalendarDay(now)

export const getWeekDates = (weekStart: string) => {
  const start = parseISO(weekStart)

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    return {
      dayOfWeek: index,
      date,
      label: format(date, "EEE"),
      fullLabel: format(date, "EEEE"),
      dayNumber: format(date, "d"),
      isoDate: format(date, "yyyy-MM-dd"),
    }
  })
}

export const formatWeekRange = (weekStart: string) => {
  const start = parseISO(weekStart)
  const end = addDays(start, 6)
  return `${format(start, "MMM d")} to ${format(end, "MMM d, yyyy")}`
}

export const shiftWeekStart = (weekStart: string, weeks: number) => {
  const start = parseISO(weekStart)
  return formatWeekStart(addDays(start, weeks * 7))
}
