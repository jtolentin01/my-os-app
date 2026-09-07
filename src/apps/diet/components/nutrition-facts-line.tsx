import type { ReactNode } from "react"
import type { NutritionFacts } from "@/apps/diet/types"
import { formatNutritionGrams } from "@/apps/diet/utils/nutrition"
import { cn } from "@/lib/utils"

type NutritionFactsLineProps = {
  facts: NutritionFacts
  className?: string
  suffix?: ReactNode
}

export const NutritionFactsLine = ({
  facts,
  className,
  suffix,
}: NutritionFactsLineProps) => (
  <span
    className={cn(
      "inline-flex flex-wrap items-center gap-x-1.5 text-xs leading-relaxed",
      className
    )}
  >
    <span className="font-medium text-nutrition-kcal">
      {Math.round(facts.calories)} kcal
    </span>
    <span className="text-muted-foreground/60" aria-hidden>
      ·
    </span>
    <span className="font-medium text-nutrition-carbs">
      C {formatNutritionGrams(facts.carbs_g)}
    </span>
    <span className="text-muted-foreground/60" aria-hidden>
      ·
    </span>
    <span className="font-medium text-nutrition-protein">
      P {formatNutritionGrams(facts.protein_g)}
    </span>
    <span className="text-muted-foreground/60" aria-hidden>
      ·
    </span>
    <span className="font-medium text-nutrition-fat">
      F {formatNutritionGrams(facts.fat_g)}
    </span>
    {suffix ? (
      <>
        <span className="text-muted-foreground/60" aria-hidden>
          ·
        </span>
        <span className="text-muted-foreground">{suffix}</span>
      </>
    ) : null}
  </span>
)
