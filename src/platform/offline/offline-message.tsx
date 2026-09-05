"use client"

import { WifiOff } from "lucide-react"

type OfflineMessageProps = {
  title?: string
  description?: string
}

export const OfflineMessage = ({
  title = "You're offline",
  description = "This page needs an internet connection. You can still open Notes to view and edit saved notes on this device.",
}: OfflineMessageProps) => {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-4 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <a
        href="/notes"
        className="mt-2 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
      >
        Open Notes
      </a>
    </div>
  )
}
