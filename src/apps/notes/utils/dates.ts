import { format } from "date-fns"

export const formatCalendarDay = (date: Date = new Date()) =>
  format(date, "yyyy-MM-dd")

export const isPastCalendarDay = (isoDate: string, now: Date = new Date()) =>
  isoDate < formatCalendarDay(now)

export const isCreatedOnPastDay = (createdAt: string, now: Date = new Date()) =>
  isPastCalendarDay(formatCalendarDay(new Date(createdAt)), now)
