"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
} from "lucide-react"
import { captureVideoFrameDataUrl } from "@/apps/call/lib/camera-frames"
import {
  CALL_NOISE_MODES,
  getCallNoiseMode,
  readStoredCallNoiseMode,
  writeStoredCallNoiseMode,
  type CallNoiseMode,
} from "@/apps/call/lib/noise-mode"
import {
  RealtimeCallSession,
  type CallStatus,
} from "@/apps/call/lib/realtime-session"
import { Button } from "@/components/ui/button"
import { AssistantAvatar } from "@/platform/components/assistant-avatar"
import { useOnlineStatus } from "@/platform/offline/use-online-status"
import { cn } from "@/lib/utils"

const MAX_CALL_MS = 15 * 60 * 1000
const subscribeNoop = () => () => {}

const statusLabel = (status: CallStatus, muted: boolean) => {
  switch (status) {
    case "idle":
      return "Ready when you are"
    case "connecting":
      return "Connecting…"
    case "listening":
      return muted ? "Muted — unmute to talk" : "Listening"
    case "speaking":
      return "My OS is speaking — you can interrupt"
    case "tool":
      return "Working in your apps…"
    case "ended":
      return "Call ended"
    case "error":
      return "Something went wrong"
  }
}

export const CallWorkspace = () => {
  const isOnline = useOnlineStatus()
  const hasMounted = useSyncExternalStore(subscribeNoop, () => true, () => false)
  const storedNoiseMode = useSyncExternalStore(
    subscribeNoop,
    readStoredCallNoiseMode,
    () => "quiet" as CallNoiseMode
  )
  const sessionRef = useRef<RealtimeCallSession | null>(null)
  const previewRef = useRef<HTMLVideoElement | null>(null)
  const maxTimerRef = useRef<number | null>(null)

  const [status, setStatus] = useState<CallStatus>("idle")
  const [error, setError] = useState("")
  const [muted, setMuted] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [wantCameraOnStart, setWantCameraOnStart] = useState(false)
  const [noiseModeOverride, setNoiseModeOverride] = useState<CallNoiseMode | null>(
    null
  )
  const [elapsedSec, setElapsedSec] = useState(0)
  const [toolNotes, setToolNotes] = useState<string[]>([])
  const [lastAssistantLine, setLastAssistantLine] = useState("")

  const noiseMode = noiseModeOverride ?? (hasMounted ? storedNoiseMode : "quiet")

  const inCall =
    status === "connecting" ||
    status === "listening" ||
    status === "speaking" ||
    status === "tool"

  useEffect(() => {
    if (!inCall) return

    const startedAt = Date.now()
    const tick = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(tick)
  }, [inCall])

  useEffect(() => {
    if (!cameraEnabled) return
    sessionRef.current?.attachPreview(previewRef.current)
  }, [cameraEnabled])

  useEffect(() => {
    return () => {
      if (maxTimerRef.current !== null) {
        window.clearTimeout(maxTimerRef.current)
      }
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [])

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")
    const secs = (seconds % 60).toString().padStart(2, "0")
    return `${mins}:${secs}`
  }

  const selectNoiseMode = (mode: CallNoiseMode) => {
    setNoiseModeOverride(mode)
    writeStoredCallNoiseMode(mode)
    if (inCall) {
      sessionRef.current?.setNoiseMode(mode)
    }
  }

  const endCall = () => {
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
    sessionRef.current?.stop()
    sessionRef.current = null
    setStatus("ended")
    setMuted(false)
    setCameraEnabled(false)
  }

  const startCall = async () => {
    if (!isOnline) {
      setError("You need to be online to call My OS.")
      setStatus("error")
      return
    }

    setError("")
    setToolNotes([])
    setLastAssistantLine("")
    setElapsedSec(0)
    setMuted(false)
    setCameraEnabled(wantCameraOnStart)
    setStatus("connecting")

    const session = new RealtimeCallSession({
      onStatus: (next) => {
        if (next === "ended") return
        if (next === "listening" || next === "speaking") {
          setError("")
        }
        setStatus(next)
      },
      onError: (message, fatal = true) => {
        setError(message)
        if (!fatal) return
        setStatus("error")
        if (maxTimerRef.current !== null) {
          window.clearTimeout(maxTimerRef.current)
          maxTimerRef.current = null
        }
        sessionRef.current?.stop()
        sessionRef.current = null
        setMuted(false)
        setCameraEnabled(false)
      },
      onTranscript: (role, text) => {
        if (role === "assistant") {
          setLastAssistantLine(text)
        }
      },
      onToolSummary: (summary) => {
        setToolNotes((prev) => [summary, ...prev].slice(0, 4))
      },
    })

    sessionRef.current = session
    session.setFrameCapture(() => {
      if (!previewRef.current) return null
      return captureVideoFrameDataUrl(previewRef.current)
    })

    try {
      await session.start({
        cameraEnabled: wantCameraOnStart,
        noiseMode,
      })
      session.attachPreview(previewRef.current)
      maxTimerRef.current = window.setTimeout(() => {
        setError("Call reached the 15-minute limit.")
        endCall()
      }, MAX_CALL_MS)
    } catch (err) {
      session.stop()
      sessionRef.current = null
      setStatus("error")
      setError(
        err instanceof Error
          ? err.message
          : "Could not start the call. Check mic permissions."
      )
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    sessionRef.current?.setMuted(next)
  }

  const toggleCamera = async () => {
    const next = !cameraEnabled
    try {
      await sessionRef.current?.setCameraEnabled(next)
      setCameraEnabled(next)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Camera permission was denied."
      )
    }
  }

  const activeNoise = getCallNoiseMode(noiseMode)

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background md:h-full">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(24,24,27,0.12),transparent_45%),radial-gradient(circle_at_70%_80%,rgba(24,24,27,0.08),transparent_40%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.04),transparent_40%)]" />

      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">Call</p>
          <p className="truncate text-xs text-muted-foreground">
            Live voice with My OS
            {inCall ? ` · ${activeNoise.label}` : ""}
          </p>
        </div>
        {inCall ? (
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatElapsed(elapsedSec)}
          </p>
        ) : null}
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4 py-8 md:px-8">
        <div className="relative flex w-full max-w-lg flex-col items-center gap-6">
          <div
            className={cn(
              "relative size-40 overflow-hidden rounded-full border border-border/70 bg-muted/40 shadow-sm transition-all sm:size-48",
              status === "speaking" && "scale-[1.03] ring-4 ring-primary/25",
              status === "listening" && "ring-2 ring-border",
              status === "connecting" && "animate-pulse"
            )}
          >
            <AssistantAvatar priority className="size-full" />
            {status === "speaking" ? (
              <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-primary/35" />
            ) : null}
          </div>

          <div className="space-y-2 text-center">
            <p className="text-lg font-medium tracking-tight">My OS</p>
            <p className="text-sm text-muted-foreground">
              {statusLabel(status, muted)}
            </p>
            {lastAssistantLine && inCall ? (
              <p className="mx-auto max-w-md text-sm text-balance text-foreground/80">
                {lastAssistantLine}
              </p>
            ) : null}
          </div>

          <div
            className={cn(
              "relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/70 bg-muted/30",
              cameraEnabled ? "aspect-video" : "hidden"
            )}
          >
            <video
              ref={previewRef}
              className="size-full object-cover"
              playsInline
              muted
              autoPlay
            />
          </div>

          {toolNotes.length > 0 && inCall ? (
            <div className="w-full max-w-md space-y-1.5">
              {toolNotes.map((note, index) => (
                <p
                  key={`${index}-${note}`}
                  className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
                >
                  {note}
                </p>
              ))}
            </div>
          ) : null}

          {error ? (
            <p className="max-w-md text-center text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <footer className="relative z-10 border-t border-border/60 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:px-6">
        {!inCall ? (
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
            <div
              className="grid w-full grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Mic noise mode"
            >
              {CALL_NOISE_MODES.map((mode) => {
                const selected = noiseMode === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectNoiseMode(mode.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-foreground/20 bg-muted"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <p className="text-sm font-medium">{mode.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {mode.description}
                    </p>
                  </button>
                )
              })}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={wantCameraOnStart}
                onChange={(event) => setWantCameraOnStart(event.target.checked)}
              />
              Share camera when the call starts
            </label>
            <Button
              size="lg"
              className="min-w-48"
              disabled={!isOnline}
              onClick={() => {
                void startCall()
              }}
            >
              <Phone data-icon="inline-start" />
              Start call
            </Button>
            {!isOnline ? (
              <p className="text-xs text-muted-foreground">
                Connect to the internet to start a call.
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Talk naturally. Interrupt anytime. Outdoor mode strengthens
                denoise for noisy places.
              </p>
            )}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
            <div
              className="flex w-full gap-2"
              role="radiogroup"
              aria-label="Mic noise mode"
            >
              {CALL_NOISE_MODES.map((mode) => {
                const selected = noiseMode === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={status === "connecting"}
                    onClick={() => selectNoiseMode(mode.id)}
                    className={cn(
                      "flex-1 rounded-lg border px-2.5 py-1.5 text-center text-xs font-medium transition-colors disabled:opacity-50",
                      selected
                        ? "border-foreground/20 bg-muted"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    {mode.label}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                size="icon-lg"
                variant={muted ? "secondary" : "outline"}
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={toggleMute}
                disabled={status === "connecting"}
              >
                {muted ? <MicOff /> : <Mic />}
              </Button>
              <Button
                type="button"
                size="icon-lg"
                variant={cameraEnabled ? "secondary" : "outline"}
                aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                onClick={() => {
                  void toggleCamera()
                }}
                disabled={status === "connecting"}
              >
                {cameraEnabled ? <Camera /> : <CameraOff />}
              </Button>
              <Button
                type="button"
                size="icon-lg"
                variant="destructive"
                aria-label="End call"
                onClick={endCall}
              >
                <PhoneOff />
              </Button>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
