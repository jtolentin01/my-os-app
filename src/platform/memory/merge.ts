const LIST_MERGE_KEYS = new Set([
  "likes",
  "dislikes",
  "hobby",
  "hobbies",
  "favorite_artist",
  "favorite_artists",
  "favorite_song",
  "favorite_songs",
  "favorite_food",
  "favorite_foods",
  "favorite_movie",
  "favorite_movies",
  "favorite_show",
  "favorite_shows",
  "supported_leader",
  "supported_leaders",
  "political_view",
  "political_views",
])

export const isListMergeKey = (key: string) =>
  LIST_MERGE_KEYS.has(key) ||
  key.startsWith("favorite_") ||
  key.startsWith("liked_") ||
  key.startsWith("political_") ||
  key.startsWith("supported_")

export const mergeListValues = (previous: string, next: string) => {
  const parts = [...previous.split(","), ...next.split(",")]
    .map((part) => part.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const merged: string[] = []

  for (const part of parts) {
    const token = part.toLowerCase()
    if (seen.has(token)) continue
    seen.add(token)
    merged.push(part)
  }

  return merged.join(", ")
}

export const resolveMemoryValue = (
  key: string,
  nextValue: string,
  previous?: string | null
) => {
  const value = nextValue.trim()
  if (!previous || !isListMergeKey(key)) return value
  return mergeListValues(previous, value)
}
