"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/platform/components/sidebar"
import { OfflineMessage } from "@/platform/offline/offline-message"
import { useHasMounted, useOnlineStatus } from "@/platform/offline/use-online-status"
import { cn } from "@/lib/utils"

const VoiceAssistantFab = dynamic(
  () =>
    import("@/platform/assistant/voice-assistant-fab").then((mod) => ({
      default: mod.VoiceAssistantFab,
    })),
  { ssr: false }
)

type AppShellProps = {
  children: React.ReactNode
  userEmail?: string | null
  displayName?: string | null
  avatarUrl?: string | null
}

export const AppShell = ({
  children,
  userEmail,
  displayName,
  avatarUrl,
}: AppShellProps) => {
  const pathname = usePathname()
  const isOnline = useOnlineStatus()
  const hasMounted = useHasMounted()
  const allowOfflineContent = pathname.startsWith("/notes")
  const showOfflineMessage = hasMounted && !isOnline && !allowOfflineContent
  const isChat = pathname.startsWith("/chat")
  const isCall = pathname.startsWith("/call")
  const isFullBleed = isChat || isCall

  return (
    <div className="flex min-h-screen flex-col bg-background md:h-svh md:flex-row md:overflow-hidden">
      <Sidebar
        userEmail={userEmail}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-x-hidden",
          isFullBleed ? "md:overflow-hidden" : "md:overflow-y-auto"
        )}
      >
        <main
          className={cn(
            "min-w-0 flex-1",
            isFullBleed
              ? "flex flex-col overflow-hidden p-0"
              : "px-4 pt-6 pb-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] md:px-8 md:pt-8 md:pb-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))]"
          )}
        >
          {showOfflineMessage ? <OfflineMessage /> : children}
        </main>
      </div>
      <VoiceAssistantFab />
    </div>
  )
}
