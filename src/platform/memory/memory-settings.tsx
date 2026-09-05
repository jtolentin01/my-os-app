"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { deleteMemoryAction } from "@/platform/memory/actions"
import type { UserMemory } from "@/platform/memory/types"
import { Button } from "@/components/ui/button"

type MemorySettingsProps = {
  memories: UserMemory[]
}

export const MemorySettings = ({ memories: initialMemories }: MemorySettingsProps) => {
  const [memories, setMemories] = useState(initialMemories)
  const [error, setError] = useState("")
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleDelete = async (memory: UserMemory) => {
    setPendingId(memory.id)
    setError("")
    const result = await deleteMemoryAction({ id: memory.id })
    setPendingId(null)

    if (result.error) {
      setError(result.error)
      return
    }

    setMemories((current) => current.filter((item) => item.id !== memory.id))
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {memories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No saved personal facts yet. Chat will remember things you share there.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  {memory.category} · {memory.key}
                </p>
                <p className="mt-1 text-sm break-words">{memory.value}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${memory.key}`}
                disabled={pendingId === memory.id}
                onClick={() => void handleDelete(memory)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
