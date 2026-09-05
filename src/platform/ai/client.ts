import OpenAI from "openai"
import { resolveAiModel } from "@/platform/ai/models"

export const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error("OpenAI is not configured.")
  }

  return new OpenAI({ apiKey })
}

export const getOpenAIModel = (preferred?: string | null) =>
  resolveAiModel(preferred)
