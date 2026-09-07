export const DEFAULT_REALTIME_MODEL = "gpt-realtime"
export const DEFAULT_REALTIME_VOICE = "marin"

export const resolveRealtimeModel = () =>
  process.env.OPENAI_REALTIME_MODEL?.trim() || DEFAULT_REALTIME_MODEL

export const resolveRealtimeVoice = () =>
  process.env.OPENAI_REALTIME_VOICE?.trim() || DEFAULT_REALTIME_VOICE
