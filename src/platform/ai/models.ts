export type AiModelCost = "low" | "medium" | "high" | "very_high"

export type AiModelOption = {
  id: string
  label: string
  cost: AiModelCost
  description: string
}

export const AI_MODEL_COST_LABELS: Record<AiModelCost, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very high",
}

export const FALLBACK_AI_MODELS: AiModelOption[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    cost: "low",
    description: "Fast and affordable for everyday chat",
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    cost: "high",
    description: "Higher quality for harder requests",
  },
]

const EXCLUDED_MODEL_PATTERN =
  /(embed|whisper|tts|dall-e|davinci|babbage|moderation|realtime|audio|transcribe|image|search|computer|codex-mini)/i

export const isChatModelId = (id: string) => {
  const value = id.trim()
  if (!value || EXCLUDED_MODEL_PATTERN.test(value)) return false
  if (value.startsWith("ft:")) return false
  if (/\d{4}-\d{2}-\d{2}/.test(value)) return false
  return /^(gpt-|o[0-9]|chatgpt-)/i.test(value)
}

export const formatModelLabel = (id: string) => {
  const cleaned = id
    .replace(/^chatgpt-/i, "ChatGPT ")
    .replace(/^gpt-/i, "GPT-")
    .replace(/-/g, " ")
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase())
}

export const estimateModelCost = (id: string): AiModelCost => {
  const value = id.toLowerCase()
  const isMini = /(mini|nano|luna|lite)/.test(value)
  const isReasoning = /^o[0-9]/.test(value)

  if (isMini) {
    return isReasoning ? "medium" : "low"
  }

  if (
    /(^o1$|^o3$|o1-pro|gpt-5(\.5|-pro|$)|gpt-4\.5|chatgpt-4o-latest)/.test(
      value
    )
  ) {
    return "very_high"
  }

  if (isReasoning || /(gpt-4o$|gpt-4\.1$|gpt-5)/.test(value)) {
    return "high"
  }

  return "medium"
}

export const describeModelCost = (cost: AiModelCost) => {
  switch (cost) {
    case "low":
      return "Lower-cost option for everyday chat"
    case "medium":
      return "Balanced quality and cost"
    case "high":
      return "Higher quality for harder requests"
    case "very_high":
      return "Top-tier capability; use sparingly"
  }
}

export const toAiModelOption = (id: string): AiModelOption => {
  const cost = estimateModelCost(id)
  return {
    id,
    label: formatModelLabel(id),
    cost,
    description: describeModelCost(cost),
  }
}

export const resolveAiModel = (preferred?: string | null) => {
  const trimmed = preferred?.trim()
  if (trimmed) return trimmed
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"
}

export const pickDefaultModelId = (
  models: AiModelOption[],
  preferred?: string | null
) => {
  const trimmed = preferred?.trim()
  if (trimmed && models.some((model) => model.id === trimmed)) {
    return trimmed
  }

  const envModel = process.env.OPENAI_MODEL?.trim()
  if (envModel && models.some((model) => model.id === envModel)) {
    return envModel
  }

  const lowCost = models.find((model) => model.cost === "low")
  return lowCost?.id ?? models[0]?.id ?? "gpt-4o-mini"
}
