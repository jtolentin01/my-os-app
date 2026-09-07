export type CallNoiseMode = "quiet" | "outdoor"

export type CallNoiseModeOption = {
  id: CallNoiseMode
  label: string
  description: string
  noiseReduction: "near_field" | "far_field"
  vadThreshold: number
  silenceDurationMs: number
}

export const CALL_NOISE_MODE_STORAGE_KEY = "myos.call.noiseMode"

export const CALL_NOISE_MODES: CallNoiseModeOption[] = [
  {
    id: "quiet",
    label: "Quiet",
    description: "Indoor or headset — clearer nearby voice",
    noiseReduction: "near_field",
    vadThreshold: 0.5,
    silenceDurationMs: 600,
  },
  {
    id: "outdoor",
    label: "Outdoor",
    description: "Noisy places — stronger denoise, focus on voice",
    noiseReduction: "far_field",
    vadThreshold: 0.68,
    silenceDurationMs: 750,
  },
]

export const isCallNoiseMode = (value: string): value is CallNoiseMode =>
  CALL_NOISE_MODES.some((mode) => mode.id === value)

export const getCallNoiseMode = (value?: string | null): CallNoiseModeOption => {
  if (value && isCallNoiseMode(value)) {
    return CALL_NOISE_MODES.find((mode) => mode.id === value)!
  }
  return CALL_NOISE_MODES[0]!
}

export const readStoredCallNoiseMode = (): CallNoiseMode => {
  try {
    const stored = window.localStorage.getItem(CALL_NOISE_MODE_STORAGE_KEY)
    if (stored && isCallNoiseMode(stored)) return stored
  } catch {}
  return "quiet"
}

export const writeStoredCallNoiseMode = (mode: CallNoiseMode) => {
  try {
    window.localStorage.setItem(CALL_NOISE_MODE_STORAGE_KEY, mode)
  } catch {}
}
