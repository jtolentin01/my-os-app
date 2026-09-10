import { zodTextFormat } from "openai/helpers/zod"
import { getOpenAIClient, getOpenAIModel } from "@/platform/ai/client"
import {
  lifeGenerationResultSchema,
  type LifeGenerationResult,
} from "@/platform/life/schemas"
import type { LifeStats, UserLifeProfile } from "@/platform/life/types"

const GENERATION_INSTRUCTIONS = [
  "You are My OS life analyst. Build a living user foundation and a readable period report from the provided stats only.",
  "Return JSON only matching the schema.",
  "Do not invent facts, medical diagnoses, or financial guarantees.",
  "If a domain has little or no data, use insufficient_data / unknown fields and say so briefly.",
  "Health: judge improving/stable/declining from weight trend and workout consistency.",
  "Diet: judge macro balance and meal coverage from nutrition totals; call out protein/fat/carb skew when clear.",
  "Money: judge stability from income vs expense trends and debt pressure; be practical and non-shaming.",
  "Notes: extract themes, interests, and possible open problems as careful hypotheses from note samples only.",
  "portrait_summary should be 2-4 sentences characterizing the user right now.",
  "push_summary must be one short lock-screen line (max 160 chars) with the most useful status and one focus action.",
  "priorities, risks, and strengths should be short actionable phrases.",
  "report_markdown should be concise Markdown with sections for Overview, Health, Diet, Money, Notes, and Next focus.",
  "domain_deltas must include health, diet, money, and notes strings. Use a short delta vs previous profile, or an empty string when unchanged or unknown.",
  "Tone: warm, direct, personal, practical.",
].join(" ")

export const generateLifeFoundation = async (input: {
  stats: LifeStats
  previousProfile?: UserLifeProfile | null
}): Promise<LifeGenerationResult> => {
  const client = getOpenAIClient()
  const model = getOpenAIModel()

  const previous = input.previousProfile
    ? {
        confidence: input.previousProfile.confidence,
        portrait_summary: input.previousProfile.portrait_summary,
        priorities: input.previousProfile.priorities,
        risks: input.previousProfile.risks,
        strengths: input.previousProfile.strengths,
        health: input.previousProfile.health,
        diet: input.previousProfile.diet,
        money: input.previousProfile.money,
        notes: input.previousProfile.notes,
        generated_at: input.previousProfile.generated_at,
      }
    : null

  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content: GENERATION_INSTRUCTIONS,
      },
      {
        role: "user",
        content: [
          `Stats JSON:\n${JSON.stringify(input.stats)}`,
          `Previous life profile JSON:\n${JSON.stringify(previous)}`,
        ].join("\n\n"),
      },
    ],
    text: {
      format: zodTextFormat(lifeGenerationResultSchema, "life_foundation"),
    },
  })

  const parsed = response.output_parsed
  if (!parsed) {
    throw new Error("Life foundation generation returned no result.")
  }

  return lifeGenerationResultSchema.parse(parsed)
}
