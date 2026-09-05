"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Brain, Globe, History, ImagePlus, MessageSquarePlus, Trash2, X } from "lucide-react"
import {
  createChatThreadAction,
  deleteChatThreadAction,
  listChatMessagesAction,
  sendChatMessageAction,
} from "@/apps/chat/services/actions"
import { ChatMarkdown } from "@/apps/chat/components/chat-markdown"
import type { ChatMessage, ChatThread } from "@/apps/chat/types"
import {
  CHAT_IMAGE_MAX_BYTES,
  IMAGE_ONLY_USER_MESSAGE,
  isChatImageMimeType,
  readFileAsDataUrl,
} from "@/apps/chat/utils/image-attachment"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { UserMemory } from "@/platform/memory/types"
import {
  AI_MODEL_COST_LABELS,
  toAiModelOption,
  type AiModelOption,
} from "@/platform/ai/models"
import { useOnlineStatus } from "@/platform/offline/use-online-status"
import { cn } from "@/lib/utils"

type WorkspaceMessage = ChatMessage & {
  imagePreviewUrl?: string
}

type ChatWorkspaceProps = {
  threads: ChatThread[]
  initialThreadId?: string | null
  initialMessages: ChatMessage[]
  models: AiModelOption[]
  defaultModel: string
}

const MODEL_STORAGE_KEY = "myos.chat.model"
const WEB_SEARCH_STORAGE_KEY = "myos.chat.webSearch"
const SAVE_MEMORY_STORAGE_KEY = "myos.chat.saveMemory"

const readStoredModel = (models: AiModelOption[], fallback: string) => {
  try {
    const stored = window.localStorage.getItem(MODEL_STORAGE_KEY)?.trim()
    if (stored && models.some((model) => model.id === stored)) {
      return stored
    }
  } catch {}
  return fallback
}

const readStoredWebSearch = () => {
  try {
    return window.localStorage.getItem(WEB_SEARCH_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

const readStoredSaveMemory = () => {
  try {
    const stored = window.localStorage.getItem(SAVE_MEMORY_STORAGE_KEY)
    if (stored === null) return true
    return stored === "1"
  } catch {
    return true
  }
}

const subscribeNoop = () => () => {}

export const ChatWorkspace = ({
  threads: initialThreads,
  initialThreadId = null,
  initialMessages,
  models,
  defaultModel,
}: ChatWorkspaceProps) => {
  const isOnline = useOnlineStatus()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const requestIdRef = useRef(0)

  const [threads, setThreads] = useState(initialThreads)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId
  )
  const [messages, setMessages] = useState<WorkspaceMessage[]>(initialMessages)
  const [draft, setDraft] = useState("")
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState<string | null>(
    null
  )
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [savedMemories, setSavedMemories] = useState<UserMemory[]>([])
  const [usedWebSearch, setUsedWebSearch] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [modelOverride, setModelOverride] = useState<string | null>(null)
  const [webSearchOverride, setWebSearchOverride] = useState<boolean | null>(
    null
  )
  const [saveMemoryOverride, setSaveMemoryOverride] = useState<boolean | null>(
    null
  )

  const clearImageInput = () => {
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }

  const clearPendingImage = () => {
    setPendingImageDataUrl(null)
    clearImageInput()
  }

  const storedModel = useSyncExternalStore(
    subscribeNoop,
    () => readStoredModel(models, defaultModel),
    () => defaultModel
  )
  const preferredModel = modelOverride ?? storedModel
  const model = models.some((option) => option.id === preferredModel)
    ? preferredModel
    : defaultModel

  const storedWebSearch = useSyncExternalStore(
    subscribeNoop,
    readStoredWebSearch,
    () => false
  )
  const webSearch = webSearchOverride ?? storedWebSearch

  const storedSaveMemory = useSyncExternalStore(
    subscribeNoop,
    readStoredSaveMemory,
    () => true
  )
  const saveMemory = saveMemoryOverride ?? storedSaveMemory

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isPending, savedMemories, usedWebSearch])

  const selectedModel =
    models.find((option) => option.id === model) ??
    models.find((option) => option.id === defaultModel) ??
    models[0] ??
    toAiModelOption(defaultModel)

  const visibleMessages = messages.filter((message) => message.role !== "tool")
  const activeTitle =
    threads.find((thread) => thread.id === activeThreadId)?.title || "My OS Chat"

  const handleModelChange = (value: string | null) => {
    if (!value || !models.some((option) => option.id === value)) return
    setModelOverride(value)
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, value)
    } catch {}
  }

  const handleWebSearchToggle = () => {
    const next = !webSearch
    setWebSearchOverride(next)
    try {
      window.localStorage.setItem(WEB_SEARCH_STORAGE_KEY, next ? "1" : "0")
    } catch {}
  }

  const handleSaveMemoryToggle = () => {
    const next = !saveMemory
    setSaveMemoryOverride(next)
    try {
      window.localStorage.setItem(SAVE_MEMORY_STORAGE_KEY, next ? "1" : "0")
    } catch {}
  }

  const upsertThread = (thread: ChatThread) => {
    setThreads((current) => {
      const without = current.filter((item) => item.id !== thread.id)
      return [thread, ...without]
    })
  }

  const selectThread = async (threadId: string) => {
    if (threadId === activeThreadId || isPending) return
    setActiveThreadId(threadId)
    setError("")
    setSavedMemories([])
    setUsedWebSearch(false)
    setMessages([])
    clearPendingImage()
    setHistoryOpen(false)

    const result = await listChatMessagesAction(threadId)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessages(result.messages)
  }

  const handleNewChat = async () => {
    if (isPending) return
    setError("")
    const result = await createChatThreadAction()
    if (result.error || !result.thread) {
      setError(result.error ?? "Failed to create chat.")
      return
    }
    upsertThread(result.thread)
    setActiveThreadId(result.thread.id)
    setMessages([])
    setSavedMemories([])
    setUsedWebSearch(false)
    clearPendingImage()
    setHistoryOpen(false)
  }

  const handleDeleteThread = async (threadId: string) => {
    if (isPending) return
    const result = await deleteChatThreadAction(threadId)
    if (result.error) {
      setError(result.error)
      return
    }

    const remaining = threads.filter((thread) => thread.id !== threadId)
    setThreads(remaining)

    if (activeThreadId === threadId) {
      const next = remaining[0]
      setActiveThreadId(next?.id ?? null)
      setMessages([])
      setSavedMemories([])
      setUsedWebSearch(false)
      clearPendingImage()
      if (next) {
        const loaded = await listChatMessagesAction(next.id)
        setMessages(loaded.messages)
      }
    }
  }

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError("")

    if (!isChatImageMimeType(file.type)) {
      setError("Use a JPG, PNG, or WebP image.")
      clearImageInput()
      return
    }

    if (file.size > CHAT_IMAGE_MAX_BYTES) {
      setError("Image must be 2MB or smaller.")
      clearImageInput()
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setPendingImageDataUrl(dataUrl)
    } catch {
      setError("Failed to read image.")
      clearImageInput()
    }
  }

  const handleSend = async () => {
    const message = draft.trim()
    const imageDataUrl = pendingImageDataUrl
    if ((!message && !imageDataUrl) || isPending) return

    if (!isOnline) {
      setError("Chat is available when you are back online.")
      return
    }

    const displayContent = message || IMAGE_ONLY_USER_MESSAGE
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsPending(true)
    setError("")
    setSavedMemories([])
    setUsedWebSearch(false)
    setDraft("")
    clearPendingImage()

    const optimisticId = `local-${requestId}`
    setMessages((current) => [
      ...current,
      {
        id: optimisticId,
        thread_id: activeThreadId ?? "pending",
        user_id: "local",
        role: "user",
        content: displayContent,
        tool_name: null,
        tool_call_id: null,
        created_at: new Date().toISOString(),
        imagePreviewUrl: imageDataUrl ?? undefined,
      },
    ])

    const result = await sendChatMessageAction({
      threadId: activeThreadId ?? undefined,
      message,
      imageDataUrl: imageDataUrl ?? undefined,
      model,
      webSearch,
      saveMemory,
    })

    if (requestId !== requestIdRef.current) return

    setIsPending(false)

    if (result.thread) {
      setActiveThreadId(result.thread.id)
      upsertThread(result.thread)
    }

    if (result.error) {
      setDraft(message)
      if (imageDataUrl) {
        setPendingImageDataUrl(imageDataUrl)
      }
      setError(result.error)
      setSavedMemories(result.savedMemories ?? [])
      setMessages((current) => {
        const withoutOptimistic = current.filter((item) => item.id !== optimisticId)
        if (result.userMessage) {
          const exists = withoutOptimistic.some(
            (item) => item.id === result.userMessage!.id
          )
          if (exists) return withoutOptimistic
          return [
            ...withoutOptimistic,
            {
              ...result.userMessage,
              imagePreviewUrl: imageDataUrl ?? undefined,
            },
          ]
        }
        return withoutOptimistic
      })
      return
    }

    if (!result.userMessage || !result.assistantMessage) {
      setDraft(message)
      if (imageDataUrl) {
        setPendingImageDataUrl(imageDataUrl)
      }
      setError("Failed to send message.")
      setMessages((current) => current.filter((item) => item.id !== optimisticId))
      return
    }

    setSavedMemories(result.savedMemories ?? [])
    setUsedWebSearch(
      (result.toolSummaries ?? []).some((summary) =>
        /searched the web/i.test(summary)
      )
    )
    setMessages((current) => {
      const withoutOptimistic = current.filter((item) => item.id !== optimisticId)
      const existingIds = new Set(withoutOptimistic.map((item) => item.id))
      const next = [...withoutOptimistic]
      if (!existingIds.has(result.userMessage!.id)) {
        next.push({
          ...result.userMessage!,
          imagePreviewUrl: imageDataUrl ?? undefined,
        })
      }
      if (!existingIds.has(result.assistantMessage!.id)) {
        next.push(result.assistantMessage!)
      }
      return next
    })
  }

  const threadList = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
        <p className="text-sm font-medium">Chats</p>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="New chat"
          onClick={() => void handleNewChat()}
        >
          <MessageSquarePlus className="size-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {threads.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No chats yet
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg px-2 py-1.5",
                  activeThreadId === thread.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/70"
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  onClick={() => void selectThread(thread.id)}
                >
                  {thread.title}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100"
                  aria-label="Delete chat"
                  onClick={() => void handleDeleteThread(thread.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] min-h-0 w-full min-w-0 md:h-full">
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">
              {activeTitle}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Central AI for notes, memory, and more.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleNewChat()}
            >
              New
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Open chat history"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="size-3.5" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-3 px-4 py-4">
            {visibleMessages.length === 0 && !isPending ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
                <p className="text-sm font-medium">Talk to My OS</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Ask anything, attach an image to analyze, save personal facts, or create notes from this conversation.
                </p>
              </div>
            ) : (
              visibleMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm break-words sm:max-w-[80%]",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted text-foreground"
                  )}
                >
                  {message.role === "user" && message.imagePreviewUrl ? (
                    <div className="mb-2 overflow-hidden rounded-xl">
                      <img
                        src={message.imagePreviewUrl}
                        alt="Attached"
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                  ) : null}
                  {message.role === "assistant" ? (
                    <ChatMarkdown content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              ))
            )}            {isPending ? (
              <div className="mr-auto rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                Thinking…
              </div>
            ) : null}
            {usedWebSearch ? (
              <div className="mr-auto max-w-[92%] rounded-xl border border-dashed border-border/80 px-3 py-2 text-xs text-muted-foreground sm:max-w-[80%]">
                Searched the web
              </div>
            ) : null}
            {savedMemories.length > 0 ? (
              <div className="mr-auto max-w-[92%] rounded-xl border border-dashed border-border/80 px-3 py-2 text-xs text-muted-foreground sm:max-w-[80%]">
                Remembered{" "}
                {savedMemories
                  .map((memory) => `${memory.key}: ${memory.value}`)
                  .join(" · ")}
              </div>
            ) : null}
            <div ref={bottomRef} className="h-px shrink-0" />
          </div>
        </div>

        <div className="shrink-0 border-t bg-background/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm supports-backdrop-filter:bg-background/80">
          <div className="mx-auto w-full max-w-3xl">
            {error ? (
              <p className="mb-2 text-sm text-destructive">{error}</p>
            ) : null}
            {pendingImageDataUrl ? (
              <div className="mb-2 flex items-start gap-2">
                <div className="relative overflow-hidden rounded-xl border bg-muted/40">
                  <img
                    src={pendingImageDataUrl}
                    alt="Selected attachment"
                    className="h-20 w-20 object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    className="absolute top-1 right-1"
                    aria-label="Remove image"
                    disabled={isPending}
                    onClick={clearPendingImage}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  Image is analyzed for this message only and is not saved.
                </p>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                aria-label="Attach image"
                disabled={isPending}
                onClick={() => imageInputRef.current?.click()}
              >
                <ImagePlus className="size-4" />
              </Button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => void handleImageSelect(event)}
              />
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Message My OS…"
                className="max-h-40 min-h-12 flex-1 resize-none"
                disabled={isPending}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void handleSend()
                  }
                }}
              />
              <Button
                type="button"
                disabled={isPending || (!draft.trim() && !pendingImageDataUrl)}
                onClick={() => void handleSend()}
                className="shrink-0"
              >
                Send
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Select value={model} onValueChange={handleModelChange}>
                <SelectTrigger
                  size="sm"
                  className="min-w-0 max-w-full"
                  disabled={isPending}
                  aria-label="Chat model"
                >
                  <SelectValue>
                    {selectedModel
                      ? `${selectedModel.label} · ${AI_MODEL_COST_LABELS[selectedModel.cost]}`
                      : "Select model"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  align="start"
                  alignItemWithTrigger={false}
                  className="w-72 max-w-[min(18rem,calc(100vw-2rem))]"
                >
                  {models.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <span className="flex w-full flex-col gap-0.5 text-left">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {AI_MODEL_COST_LABELS[option.cost]}
                          </span>
                        </span>
                        <span className="text-xs leading-snug text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={webSearch}
                aria-label="Toggle web search"
                disabled={isPending}
                onClick={handleWebSearchToggle}
                className={cn(
                  "h-7 gap-1.5 px-2.5 text-xs",
                  webSearch &&
                    "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                )}
              >
                <Globe className="size-3.5" />
                Web search {webSearch ? "on" : "off"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={saveMemory}
                aria-label="Toggle remember"
                disabled={isPending}
                onClick={handleSaveMemoryToggle}
                className={cn(
                  "h-7 gap-1.5 px-2.5 text-xs",
                  saveMemory &&
                    "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                )}
              >
                <Brain className="size-3.5" />
                Remember {saveMemory ? "on" : "off"}
              </Button>
            </div>
            {!isOnline ? (
              <p className="mt-2 text-xs text-muted-foreground">
                You&apos;re offline. Chat needs a connection.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="hidden min-h-0 w-72 shrink-0 flex-col border-l border-border/70 bg-card lg:flex">
        {threadList}
      </aside>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 pt-[calc(3rem+env(safe-area-inset-top,0px))] sm:max-w-xs"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Chat history</SheetTitle>
          </SheetHeader>
          {threadList}
        </SheetContent>
      </Sheet>
    </div>
  )
}
