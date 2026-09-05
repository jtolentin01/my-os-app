import OpenAI from "openai"

export const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error("OpenAI is not configured.")
  }

  return new OpenAI({ apiKey })
}

export const getOpenAIModel = () =>
  process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"
