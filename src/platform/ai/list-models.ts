import { getOpenAIClient } from "@/platform/ai/client"
import {
  FALLBACK_AI_MODELS,
  isChatModelId,
  pickDefaultModelId,
  toAiModelOption,
  type AiModelOption,
} from "@/platform/ai/models"

const CACHE_TTL_MS = 60 * 60 * 1000

type ModelsCache = {
  at: number
  models: AiModelOption[]
}

let cache: ModelsCache | null = null

const COST_RANK: Record<AiModelOption["cost"], number> = {
  low: 0,
  medium: 1,
  high: 2,
  very_high: 3,
}

const sortModels = (models: AiModelOption[]) =>
  [...models].sort((left, right) => {
    const costDiff = COST_RANK[left.cost] - COST_RANK[right.cost]
    if (costDiff !== 0) return costDiff
    return left.label.localeCompare(right.label)
  })

const dedupeModels = (models: AiModelOption[]) => {
  const seen = new Set<string>()
  const unique: AiModelOption[] = []

  for (const model of models) {
    if (seen.has(model.id)) continue
    seen.add(model.id)
    unique.push(model)
  }

  return unique
}

export const listChatModels = async (): Promise<AiModelOption[]> => {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.models
  }

  try {
    const client = getOpenAIClient()
    const listed = await client.models.list()
    const ids: string[] = []

    for await (const model of listed) {
      if (isChatModelId(model.id)) {
        ids.push(model.id)
      }
    }

    const models = sortModels(dedupeModels(ids.map(toAiModelOption)))
    const next = models.length > 0 ? models : FALLBACK_AI_MODELS
    cache = { at: Date.now(), models: next }
    return next
  } catch {
    if (cache?.models?.length) {
      return cache.models
    }
    return FALLBACK_AI_MODELS
  }
}

export const resolveChatModel = async (preferred?: string | null) => {
  const models = await listChatModels()
  return {
    modelId: pickDefaultModelId(models, preferred),
    models,
  }
}
