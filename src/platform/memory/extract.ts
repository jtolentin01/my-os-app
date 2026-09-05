import { zodTextFormat } from "openai/helpers/zod"
import { getOpenAIClient, getOpenAIModel } from "@/platform/ai/client"
import { memoryExtractionResultSchema } from "@/platform/memory/extraction-schema"
import { resolveMemoryValue } from "@/platform/memory/merge"
import { saveMemorySchema } from "@/platform/memory/schemas"
import {
  formatMemoriesForPrompt,
  saveMemory,
} from "@/platform/memory/services"
import type { UserMemory } from "@/platform/memory/types"

const EXTRACTION_INSTRUCTIONS = [
  "You extract personal facts a thoughtful friend would remember about this user.",
  "Return JSON only with a memories array.",
  "Each memory needs category, key (snake_case), and value.",
  "Categories: identity, people, places, work, preferences, beliefs, other.",
  "Save any clear personal information: name, age, city/hometown, job/school, family and friends (with relationship), boss/manager/coworkers by name, hobbies, likes, dislikes, favorite artists/songs/foods, gifts they like (flowers, chocolates), habits, routines, goals, political views, admired leaders, and similar self-details.",
  "Examples to save: \"I like Lil Uzi Vert\" -> preferences/favorite_artist; \"I like flowers and chocolates\" -> preferences/likes; \"here in Cebu\" -> places/city; \"my friend Mark\" -> people/friend_mark; \"my boss Mike\" -> work/boss or people/boss_mike with value Mike; \"I salute Duterte, he was brave and smart\" -> beliefs/political_view or beliefs/supported_leader.",
  "If a message mixes personal fact with noise (mood, complaint, one-off incident), still extract the personal fact and skip only the noise. Example: disappointed with boss Mike who accused me -> save boss Mike; do not save the accusation drama.",
  "Always save named people with a role when stated: boss, manager, coworker, friend, brother, sister, partner, teacher, etc.",
  "Save clear political or civic views the user states about themselves (party lean, admired leaders, strong support/opposition). Summarize briefly in the value.",
  "Skip pure noise with no personal identity: moods alone, temporary logistics, and questions that reveal no self-info.",
  "Do not invent facts. If nothing personal was shared, return an empty memories array.",
  "Prefer stable keys: name, city, location, job, boss, manager, coworker_<name>, brother_name, sister_name, partner_name, friend_<name>, favorite_artist, favorite_song, favorite_food, likes, dislikes, hobby, political_view, supported_leader.",
  "List-style keys append over time (likes, dislikes, hobby, favorite_artist, favorite_song, favorite_food, supported_leader). Example: existing favorite_artist \"Lil Uzi Vert\" plus new \"Drake\" becomes \"Lil Uzi Vert, Drake\".",
  "When adding to an existing list-style memory, merge with the existing value and keep prior items.",
  "If a fact already exists with the same meaning, omit it.",
].join(" ")

const normalizeKey = (key: string) =>
  key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80)

export const extractAndSaveMemories = async (input: {
  userMessage: string
  existingMemories: UserMemory[]
}): Promise<UserMemory[]> => {
  const trimmed = input.userMessage.trim()
  if (!trimmed) return []

  const client = getOpenAIClient()
  const model = getOpenAIModel()

  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content: EXTRACTION_INSTRUCTIONS,
      },
      {
        role: "user",
        content: [
          `Existing memories:\n${formatMemoriesForPrompt(input.existingMemories)}`,
          `Latest user message:\n${trimmed}`,
        ].join("\n\n"),
      },
    ],
    text: {
      format: zodTextFormat(memoryExtractionResultSchema, "memory_extraction"),
    },
  })

  const parsed = response.output_parsed
  if (!parsed?.memories?.length) return []

  const existingByKey = new Map(
    input.existingMemories.map((memory) => [memory.key, memory.value])
  )

  const saved: UserMemory[] = []

  for (const candidate of parsed.memories) {
    const key = normalizeKey(candidate.key)
    if (!key) continue

    const previous = existingByKey.get(key)
    const value = resolveMemoryValue(key, candidate.value, previous)

    const prepared = saveMemorySchema.safeParse({
      category: candidate.category,
      key,
      value,
      source: "chat_auto",
    })

    if (!prepared.success) continue

    if (
      previous &&
      previous.trim().toLowerCase() === prepared.data.value.trim().toLowerCase()
    ) {
      continue
    }

    const memory = await saveMemory(prepared.data)
    existingByKey.set(memory.key, memory.value)
    saved.push(memory)
  }

  return saved
}

export const extractAndSaveMemoriesSafe = async (input: {
  userMessage: string
  existingMemories: UserMemory[]
}): Promise<UserMemory[]> => {
  try {
    return await extractAndSaveMemories(input)
  } catch {
    return []
  }
}
