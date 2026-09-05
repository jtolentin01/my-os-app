"use client"

import { getEnabledAccents, isAccentId } from "@/platform/theme/accents"
import { useAccent, useAccentMounted } from "@/platform/theme/accent-provider"
import { cn } from "@/lib/utils"

export const AccentSelector = () => {
  const { accent, setAccent } = useAccent()
  const mounted = useAccentMounted()
  const accents = getEnabledAccents()

  if (!mounted) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {accents.map((item) => (
          <div
            key={item.id}
            className="h-[4.5rem] rounded-lg border border-border bg-muted/30"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Accent color">
      {accents.map((item) => {
        const isSelected = accent === item.id

        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => {
              if (isAccentId(item.id)) {
                setAccent(item.id)
              }
            }}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
              isSelected
                ? "border-foreground/20 bg-muted"
                : "border-border hover:bg-muted/50"
            )}
          >
            <div
              className="mt-0.5 size-8 shrink-0 rounded-md ring-1 ring-border"
              style={{ backgroundColor: item.swatch }}
            />
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
