"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Mic } from "lucide-react"
import {
  RealtimeCallSession,
  type CallStatus,
} from "@/apps/call/lib/realtime-session"
import { readStoredCallNoiseMode } from "@/apps/call/lib/noise-mode"
import { AssistantAvatar } from "@/platform/components/assistant-avatar"
import { useModalHistory } from "@/platform/hooks/use-modal-history"
import { useOnlineStatus } from "@/platform/offline/use-online-status"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const MAX_ASSISTANT_MS = 5 * 60 * 1000

const statusLabel = (status: CallStatus, holding: boolean) => {
  switch (status) {
    case "idle":
      return "Ready when you are"
    case "connecting":
      return "Connecting…"
    case "listening":
      return holding ? "Listening — keep holding" : "Hold to talk"
    case "speaking":
      return "My OS is speaking"
    case "tool":
      return "Working in your apps…"
    case "ended":
      return "Session ended"
    case "error":
      return "Something went wrong"
  }
}

export const VoiceAssistantFab = () => {
  const pathname = usePathname()
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const sessionRef = useRef<RealtimeCallSession | null>(null)
  const maxTimerRef = useRef<number | null>(null)
  const holdingRef = useRef(false)
  const routerRef = useRef(router)

  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<CallStatus>("idle")
  const [error, setError] = useState("")
  const [holding, setHolding] = useState(false)
  const [lastAssistantLine, setLastAssistantLine] = useState("")
  const [toolNotes, setToolNotes] = useState<string[]>([])

  const hideFab = pathname.startsWith("/call")
  const activeStatus = open && !isOnline ? "error" : status
  const activeError =
    open && !isOnline ? "You need to be online to talk." : error
  const inSession =
    activeStatus === "connecting" ||
    activeStatus === "listening" ||
    activeStatus === "speaking" ||
    activeStatus === "tool"
  const canTalk =
    isOnline &&
    (status === "listening" || status === "speaking" || status === "tool")

  useEffect(() => {
    routerRef.current = router
  }, [router])

  const clearMaxTimer = () => {
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
  }

  const stopSession = () => {
    clearMaxTimer()
    holdingRef.current = false
    setHolding(false)
    sessionRef.current?.stop()
    sessionRef.current = null
  }

  const resetUi = () => {
    setStatus("idle")
    setError("")
    setLastAssistantLine("")
    setToolNotes([])
    setHolding(false)
    holdingRef.current = false
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      stopSession()
      resetUi()
    }
    setOpen(next)
  }

  useModalHistory({
    open,
    onClose: () => handleOpenChange(false),
    id: "voice-assistant",
  })

  useEffect(() => {
    return () => {
      clearMaxTimer()
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open || !isOnline) {
      return
    }

    let cancelled = false
    let session: RealtimeCallSession | null = null

    const start = async () => {
      setError("")
      setToolNotes([])
      setLastAssistantLine("")
      setStatus("connecting")

      session = new RealtimeCallSession({
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
          clearMaxTimer()
          sessionRef.current?.stop()
          sessionRef.current = null
          holdingRef.current = false
          setHolding(false)
        },
        onTranscript: (role, text) => {
          if (role === "assistant") {
            setLastAssistantLine(text)
          }
        },
        onToolSummary: (summary) => {
          setToolNotes((prev) => [summary, ...prev].slice(0, 4))
          routerRef.current.refresh()
        },
      })

      sessionRef.current = session

      try {
        await session.start({
          cameraEnabled: false,
          noiseMode: readStoredCallNoiseMode(),
          startMuted: true,
        })
        if (cancelled) {
          session.stop()
          if (sessionRef.current === session) {
            sessionRef.current = null
          }
          return
        }
        maxTimerRef.current = window.setTimeout(() => {
          setError("Assistant session reached the time limit.")
          session?.stop()
          if (sessionRef.current === session) {
            sessionRef.current = null
          }
          holdingRef.current = false
          setHolding(false)
          clearMaxTimer()
          setStatus("ended")
        }, MAX_ASSISTANT_MS)
      } catch (err) {
        session.stop()
        if (sessionRef.current === session) {
          sessionRef.current = null
        }
        if (cancelled) return
        setStatus("error")
        setError(
          err instanceof Error
            ? err.message
            : "Could not start the assistant. Check mic permissions."
        )
      }
    }

    void start()

    return () => {
      cancelled = true
      clearMaxTimer()
      holdingRef.current = false
      setHolding(false)
      session?.stop()
      if (sessionRef.current === session) {
        sessionRef.current = null
      }
    }
  }, [open, isOnline])

  const setTalking = (next: boolean) => {
    if (!canTalk || !sessionRef.current) return
    if (holdingRef.current === next) return
    holdingRef.current = next
    setHolding(next)
    sessionRef.current.setMuted(!next)
  }

  if (hideFab) {
    return null
  }

  return (
    <>
      <Button
        type="button"
        size="icon-lg"
        aria-label="Open voice assistant"
        className={cn(
          "fixed z-40 size-14 rounded-full shadow-lg",
          "right-[max(1rem,env(safe-area-inset-right,0px))]",
          "bottom-[max(1rem,env(safe-area-inset-bottom,0px))]",
          open && "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(true)}
      >
        <Mic className="size-6" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border/60 px-4 py-3 pr-12">
            <DialogTitle>Voice assistant</DialogTitle>
            <DialogDescription>
              Hold the mic to talk. No camera — voice only.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-5 px-4 py-6">
            <div
              className={cn(
                "relative size-28 overflow-hidden rounded-full border border-border/70 bg-muted/40 shadow-sm transition-all",
                activeStatus === "speaking" &&
                  "scale-[1.03] ring-4 ring-primary/25",
                holding && "ring-4 ring-primary/30",
                activeStatus === "connecting" && "animate-pulse"
              )}
            >
              <AssistantAvatar className="size-full" />
            </div>

            <div className="space-y-1.5 text-center">
              <p className="text-sm font-medium tracking-tight">My OS</p>
              <p className="text-sm text-muted-foreground">
                {statusLabel(activeStatus, holding)}
              </p>
              {lastAssistantLine && inSession ? (
                <p className="mx-auto max-w-xs text-sm text-balance text-foreground/80">
                  {lastAssistantLine}
                </p>
              ) : null}
            </div>

            {toolNotes.length > 0 && inSession ? (
              <div className="w-full space-y-1.5">
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

            {activeError ? (
              <p className="max-w-xs text-center text-sm text-destructive">
                {activeError}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!canTalk}
              aria-label={holding ? "Release to stop talking" : "Hold to talk"}
              className={cn(
                "flex size-20 items-center justify-center rounded-full border transition-colors select-none",
                "touch-none disabled:cursor-not-allowed disabled:opacity-50",
                holding
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted text-foreground hover:bg-muted/80"
              )}
              onPointerDown={(event) => {
                event.preventDefault()
                event.currentTarget.setPointerCapture(event.pointerId)
                setTalking(true)
              }}
              onPointerUp={() => setTalking(false)}
              onPointerCancel={() => setTalking(false)}
              onLostPointerCapture={() => setTalking(false)}
              onContextMenu={(event) => event.preventDefault()}
            >
              <Mic className="size-8" />
            </button>

            <p className="text-center text-xs text-muted-foreground">
              {canTalk
                ? "Press and hold to speak. Release when you are done."
                : activeStatus === "connecting"
                  ? "Getting ready…"
                  : activeStatus === "error" || activeStatus === "ended"
                    ? "Close and open again to retry."
                    : "Connecting…"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
