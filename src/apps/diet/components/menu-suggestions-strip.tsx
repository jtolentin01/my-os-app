"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Sparkles } from "lucide-react"
import {
  acceptMenuSuggestionsAction,
  suggestMenuItemsAction,
} from "@/apps/diet/services/nutrition-actions"
import { NutritionFactsLine } from "@/apps/diet/components/nutrition-facts-line"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useOnlineStatus } from "@/platform/offline/use-online-status"

type SuggestedDish = {
  name: string
  category: string | null
  serving_label: string
  reason: string | null
  calories: number
  carbs_g: number
  protein_g: number
  fat_g: number
}

type LoadState = {
  menuKey: string
  status: "loading" | "ready" | "error"
  suggestions: SuggestedDish[]
  error: string
}

type MenuSuggestionsStripProps = {
  menuKey: string
}

export const MenuSuggestionsStrip = ({ menuKey }: MenuSuggestionsStripProps) => {
  const isOnline = useOnlineStatus()
  const requestIdRef = useRef(0)
  const [loadState, setLoadState] = useState<LoadState>({
    menuKey,
    status: "loading",
    suggestions: [],
    error: "",
  })
  const [addingName, setAddingName] = useState<string | null>(null)

  useEffect(() => {
    if (!isOnline) return

    const requestId = ++requestIdRef.current

    const load = async () => {
      const result = await suggestMenuItemsAction({
        count: 4,
        prompt: "",
      })

      if (requestId !== requestIdRef.current) return

      if (result.error || !result.result?.items.length) {
        setLoadState({
          menuKey,
          status: "error",
          suggestions: [],
          error: result.error ?? "Suggestions are not ready yet.",
        })
        return
      }

      setLoadState({
        menuKey,
        status: "ready",
        suggestions: result.result.items.slice(0, 4),
        error: "",
      })
    }

    void load()
  }, [isOnline, menuKey])

  const handleAdd = async (dish: SuggestedDish) => {
    setAddingName(dish.name)
    const result = await acceptMenuSuggestionsAction({
      items: [
        {
          name: dish.name,
          category: dish.category,
          servingLabel: dish.serving_label,
        },
      ],
    })
    setAddingName(null)

    if (result.error) {
      setLoadState((current) => ({
        ...current,
        status: "error",
        error: result.error ?? "Failed to add dish.",
      }))
      return
    }

    setLoadState((current) => ({
      ...current,
      suggestions: current.suggestions.filter((item) => item.name !== dish.name),
    }))
  }

  const isStale = loadState.menuKey !== menuKey
  const phase = !isOnline
    ? "offline"
    : isStale || loadState.status === "loading"
      ? "loading"
      : loadState.status

  const suggestions = isStale ? [] : loadState.suggestions
  const error = isStale ? "" : loadState.error

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Suggested for you
          </h3>
          <p className="text-xs text-muted-foreground">
            Ideas based on your current menu
          </p>
        </div>
      </div>

      {phase === "loading" ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
          Preparing dish suggestions…
        </div>
      ) : null}

      {phase === "offline" ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
          Connect to the internet to see menu suggestions.
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
          {error || "Suggestions are not ready yet. Try again in a moment."}
        </div>
      ) : null}

      {phase === "ready" && suggestions.length > 0 ? (
        <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {suggestions.map((dish) => (
            <Card key={dish.name} size="sm" className="h-full">
              <CardHeader className="gap-2">
                <CardTitle className="line-clamp-2 min-h-10 text-base leading-snug">
                  {dish.name}
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  {dish.category ? (
                    <Badge variant="secondary" className="capitalize">
                      {dish.category}
                    </Badge>
                  ) : null}
                  <span>{dish.serving_label}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <NutritionFactsLine
                  facts={{
                    calories: dish.calories,
                    carbs_g: dish.carbs_g,
                    protein_g: dish.protein_g,
                    fat_g: dish.fat_g,
                  }}
                />
                <p className="line-clamp-2 min-h-8 flex-1 text-xs text-muted-foreground">
                  {dish.reason || "\u00a0"}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={addingName === dish.name}
                  onClick={() => void handleAdd(dish)}
                  className="mt-auto w-full gap-1.5"
                >
                  <Plus className="size-3.5" />
                  {addingName === dish.name ? "Adding…" : "Add to menu"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {phase === "ready" && suggestions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
          No new suggestions right now. Your menu already covers a lot.
        </div>
      ) : null}
    </section>
  )
}
