"use client"

import { format } from "date-fns"
import { useSyncExternalStore } from "react"

type DashboardGreetingProps = {
  displayName: string
  avatar: React.ReactNode
  description: string
}

const subscribeNoop = () => () => {}

const getLocalGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

const getLocalDateLabel = () => format(new Date(), "EEEE, MMMM d")

export const DashboardGreeting = ({
  displayName,
  avatar,
  description,
}: DashboardGreetingProps) => {
  const greeting = useSyncExternalStore(
    subscribeNoop,
    getLocalGreeting,
    () => "Hello"
  )
  const dateLabel = useSyncExternalStore(
    subscribeNoop,
    getLocalDateLabel,
    () => ""
  )

  return (
    <div>
      <p className="text-sm text-muted-foreground">{dateLabel || "\u00a0"}</p>
      <div className="mt-3 flex items-center gap-4">
        {avatar}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting}, {displayName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
