export const linesFromText = (value: string | null | undefined) =>
  (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

export const textFromLines = (lines: string[]) =>
  lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")

export const hasRecipeContent = (item: {
  ingredients?: string | null
  instructions?: string | null
}) =>
  Boolean(item.ingredients?.trim() || item.instructions?.trim())
