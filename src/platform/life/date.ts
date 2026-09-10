import { addDays, format, parseISO, subDays } from "date-fns"

export const DEFAULT_LIFE_TIMEZONE = "Asia/Manila"

const zonedParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"
  const hourRaw = parts.find((part) => part.type === "hour")?.value ?? "0"
  const hour = hourRaw === "24" ? 0 : Number(hourRaw)

  return {
    year,
    month,
    day,
    hour: Number.isFinite(hour) ? hour : 0,
    isoDate: `${year}-${month}-${day}`,
  }
}

export const getZonedNow = (timeZone: string, date: Date = new Date()) =>
  zonedParts(date, timeZone)

export const formatZonedDate = (timeZone: string, date: Date = new Date()) =>
  zonedParts(date, timeZone).isoDate

export const shiftIsoDate = (isoDate: string, days: number) =>
  format(addDays(parseISO(isoDate), days), "yyyy-MM-dd")

export const periodBounds = (input: {
  timeZone: string
  windowDays: number
  now?: Date
}) => {
  const end = formatZonedDate(input.timeZone, input.now)
  const start = format(
    subDays(parseISO(end), Math.max(1, input.windowDays) - 1),
    "yyyy-MM-dd"
  )
  return { periodStart: start, periodEnd: end }
}

export const daysBetweenInclusive = (start: string, end: string) => {
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  const ms = endDate.getTime() - startDate.getTime()
  return Math.max(1, Math.floor(ms / 86_400_000) + 1)
}
