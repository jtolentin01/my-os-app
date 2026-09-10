import {
  addMonths,
  endOfMonth,
  format,
  parse,
  startOfMonth,
} from "date-fns"

export const HEALTH_TIME_ZONE = "Asia/Manila"

const parseMonthStart = (monthKey: string) =>
  parse(`${monthKey}-01`, "yyyy-MM-dd", new Date())

const parseCalendarDate = (isoDate: string) =>
  parse(isoDate, "yyyy-MM-dd", new Date())

const zonedParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HEALTH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"
  return { year, month, day }
}

export const formatCalendarDay = (date: Date = new Date()) => {
  const { year, month, day } = zonedParts(date)
  return `${year}-${month}-${day}`
}

export const formatMonthKey = (date: Date = new Date()) => {
  const { year, month } = zonedParts(date)
  return `${year}-${month}`
}

export const isValidMonthParam = (value?: string) => {
  if (!value) return false
  if (!/^\d{4}-\d{2}$/.test(value)) return false
  const parsed = parseMonthStart(value)
  return !Number.isNaN(parsed.getTime()) && format(parsed, "yyyy-MM") === value
}

export const getMonthBounds = (monthKey: string) => {
  const start = startOfMonth(parseMonthStart(monthKey))
  const end = endOfMonth(start)
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  }
}

export const formatMonthLabel = (monthKey: string) =>
  format(parseMonthStart(monthKey), "MMMM yyyy")

export const shiftMonthKey = (monthKey: string, months: number) =>
  format(addMonths(parseMonthStart(monthKey), months), "yyyy-MM")

export const formatLoggedOn = (isoDate: string) =>
  format(parseCalendarDate(isoDate), "MMM d, yyyy")
