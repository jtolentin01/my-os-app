"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { getEnabledThemes, isThemeId } from "@/platform/theme/themes"
import { cn } from "@/lib/utils"

const emptySubscribe = () => () => {}

export const ThemeSelector = () => {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const themes = getEnabledThemes()

  if (!mounted) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {themes.map((item) => (
          <div
            key={item.id}
            className="h-[4.5rem] rounded-lg border border-border bg-muted/30"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Theme">
      {themes.map((item) => {
        const Icon = item.icon
        const isSelected = theme === item.id

        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => {
              if (isThemeId(item.id)) {
                setTheme(item.id)
              }
            }}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
              isSelected
                ? "border-foreground/20 bg-muted"
                : "border-border hover:bg-muted/50"
            )}
          >
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
