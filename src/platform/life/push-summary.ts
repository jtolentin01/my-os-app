import type { LifeGenerationResult } from "@/platform/life/schemas"
import type { ReportCadence, UserLifeProfile } from "@/platform/life/types"

const formatStatus = (value: string) => value.replaceAll("_", " ")

export const buildLifeReportPushSummary = (input: {
  cadence: ReportCadence
  generation: Pick<
    LifeGenerationResult,
    "push_summary" | "priorities" | "health" | "diet" | "money"
  >
  profile?: UserLifeProfile | null
}): string => {
  const fromAi = input.generation.push_summary?.trim()
  if (fromAi) {
    return fromAi.slice(0, 160)
  }

  const health = input.profile?.health.status ?? input.generation.health.status
  const diet = input.profile?.diet.status ?? input.generation.diet.status
  const money = input.profile?.money.status ?? input.generation.money.status
  const focus = input.generation.priorities[0]?.trim()

  const parts = [
    `Health ${formatStatus(health)}`,
    `diet ${formatStatus(diet)}`,
    `money ${formatStatus(money)}`,
  ]

  let summary = parts.join(" · ")
  if (focus) {
    summary = `${summary}. Focus: ${focus}`
  }

  const label = input.cadence === "daily" ? "Daily" : "Weekly"
  return `${label} report: ${summary}`.slice(0, 160)
}
