"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"
import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  type AccentId,
  isAccentId,
} from "@/platform/theme/accents"

type AccentContextValue = {
  accent: AccentId
  setAccent: (accent: AccentId) => void
}

const AccentContext = createContext<AccentContextValue | null>(null)

const applyAccent = (accent: AccentId) => {
  document.documentElement.dataset.accent = accent
}

const readStoredAccent = (): AccentId => {
  try {
    const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY)
    if (stored && isAccentId(stored)) {
      return stored
    }
  } catch {}
  return DEFAULT_ACCENT
}

type AccentProviderProps = {
  children: React.ReactNode
}

export const AccentProvider = ({ children }: AccentProviderProps) => {
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT)

  useEffect(() => {
    const stored = readStoredAccent()
    setAccentState(stored)
    applyAccent(stored)
  }, [])

  const setAccent = useCallback((next: AccentId) => {
    setAccentState(next)
    applyAccent(next)
    try {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, next)
    } catch {}
  }, [])

  const value = useMemo(
    () => ({
      accent,
      setAccent,
    }),
    [accent, setAccent]
  )

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>
}

export const useAccent = () => {
  const context = useContext(AccentContext)
  if (!context) {
    throw new Error("useAccent must be used within AccentProvider")
  }
  return context
}

const emptySubscribe = () => () => {}

export const useAccentMounted = () =>
  useSyncExternalStore(emptySubscribe, () => true, () => false)
