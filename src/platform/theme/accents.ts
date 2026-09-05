export type AccentId = "neutral" | "teal" | "blue" | "amber" | "rose"

export type AccentDefinition = {
  id: AccentId
  label: string
  description: string
  swatch: string
  enabled: boolean
}

export const accentsRegistry: AccentDefinition[] = [
  {
    id: "neutral",
    label: "Neutral",
    description: "Classic black and white",
    swatch: "oklch(0.45 0 0)",
    enabled: true,
  },
  {
    id: "teal",
    label: "Teal",
    description: "Fresh and modern",
    swatch: "oklch(0.62 0.12 180)",
    enabled: true,
  },
  {
    id: "blue",
    label: "Blue",
    description: "Calm and clear",
    swatch: "oklch(0.62 0.14 250)",
    enabled: true,
  },
  {
    id: "amber",
    label: "Amber",
    description: "Warm highlight",
    swatch: "oklch(0.75 0.14 75)",
    enabled: true,
  },
  {
    id: "rose",
    label: "Rose",
    description: "Soft contrast",
    swatch: "oklch(0.65 0.16 15)",
    enabled: true,
  },
]

export const ACCENT_STORAGE_KEY = "my-os-accent"
export const DEFAULT_ACCENT: AccentId = "teal"

export const getEnabledAccents = () =>
  accentsRegistry.filter((accent) => accent.enabled)

export const isAccentId = (value: string): value is AccentId =>
  accentsRegistry.some((accent) => accent.id === value && accent.enabled)
