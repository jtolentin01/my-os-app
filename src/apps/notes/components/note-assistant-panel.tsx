"use client"

import { useRef, useState } from "react"
import { Check, Sparkles, X } from "lucide-react"
import { runNoteAssistantAction } from "@/apps/notes/services/assistant-actions"
import type {
  NoteAssistantIntent,
  NoteAssistantResult,
} from "@/apps/notes/schemas/assistant"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const SUGGESTIONS: {
  intent: NoteAssistantIntent
  label: string
}[] = [
  { intent: "summarize", label: "Summarize" },
  { intent: "improve", label: "Improve writing" },
  { intent: "suggest_title", label: "Suggest title" },
  { intent: "extract_points", label: "Extract points" },
]

type NoteAssistantPanelProps = {
  title: string
  content: string
  isOnline: boolean
  hasPendingEdit: boolean
  onPropose: (result: NoteAssistantResult) => void
  onAccept: () => void
  onDiscard: () => void
  className?: string
}

export const NoteAssistantPanel = ({
  title,
  content,
  isOnline,
  hasPendingEdit,
  onPropose,
  onAccept,
  onDiscard,
  className,
}: NoteAssistantPanelProps) => {
  const requestIdRef = useRef(0)
  const [prompt, setPrompt] = useState("")
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState("")

  const runAssistant = async (intent: NoteAssistantIntent, nextPrompt = "") => {
    if (!isOnline) {
      setError("AI is available when you are back online.")
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsPending(true)
    setError("")
    setMessage("")

    const response = await runNoteAssistantAction({
      intent,
      title,
      content,
      prompt: nextPrompt,
    })

    if (requestId !== requestIdRef.current) {
      return
    }

    setIsPending(false)

    if (response.error || !response.result) {
      setError(response.error ?? "Failed to run the notes assistant.")
      return
    }

    setMessage(response.result.message)

    if (response.result.title || response.result.content) {
      onPropose(response.result)
    }
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-4", className)}>
      <div className="flex items-start gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">My OS AI</p>
          <p className="text-xs text-muted-foreground">
            Edits land in the note as a pending change you can accept or discard.
          </p>
        </div>
      </div>

      {!isOnline ? (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          AI is unavailable offline.
        </p>
      ) : null}

      {hasPendingEdit ? (
        <div className="flex flex-col gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2.5">
          <p className="text-xs text-teal-100/90">
            Pending AI edit in the note. Accept to keep it, or discard to restore.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onAccept}>
              <Check className="size-3.5" />
              Accept
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDiscard}>
              <X className="size-3.5" />
              Discard
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion.intent}
            type="button"
            variant="outline"
            size="sm"
            disabled={!isOnline || isPending}
            onClick={() => runAssistant(suggestion.intent)}
          >
            {suggestion.label}
          </Button>
        ))}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void runAssistant("custom", prompt)
        }}
      >
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask anything about this note..."
          disabled={!isOnline || isPending}
          className="min-h-20"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={!isOnline || isPending || !prompt.trim()}
          className="w-full"
        >
          {isPending ? "Thinking..." : "Ask AI"}
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {message ? (
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
          <p className="text-sm whitespace-pre-wrap text-foreground">{message}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Try summarizing, improving writing, or updating a table.
        </p>
      )}
    </div>
  )
}
