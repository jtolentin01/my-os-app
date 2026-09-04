"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  getEnabledThemes,
} from "@/platform/theme/themes"

type ThemeProviderProps = {
  children: React.ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const themes = getEnabledThemes().map((theme) => theme.id)

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={DEFAULT_THEME}
      enableSystem={false}
      storageKey={THEME_STORAGE_KEY}
      themes={themes}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
