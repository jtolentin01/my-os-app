import { Moon, Sun, type LucideIcon } from "lucide-react"

export type ThemeId = "light" | "dark"

export type ThemeDefinition = {
  id: ThemeId
  label: string
  description: string
  icon: LucideIcon
  enabled: boolean
}

export const themesRegistry: ThemeDefinition[] = [
  {
    id: "light",
    label: "Light",
    description: "Clean light appearance",
    icon: Sun,
    enabled: true,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Low-light appearance",
    icon: Moon,
    enabled: true,
  },
]

export const THEME_STORAGE_KEY = "my-os-theme"
export const DEFAULT_THEME: ThemeId = "light"

export const getEnabledThemes = () =>
  themesRegistry.filter((theme) => theme.enabled)

export const isThemeId = (value: string): value is ThemeId =>
  themesRegistry.some((theme) => theme.id === value && theme.enabled)
