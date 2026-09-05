"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/platform/components/sidebar"
import { OfflineMessage } from "@/platform/offline/offline-message"
import { useHasMounted, useOnlineStatus } from "@/platform/offline/use-online-status"

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

  return (
    <div className="flex min-h-screen flex-col bg-background md:h-svh md:flex-row md:overflow-hidden">
      <Sidebar
        userEmail={userEmail}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />
      <div className="flex min-w-0 flex-1 flex-col md:overflow-y-auto">
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {showOfflineMessage ? <OfflineMessage /> : children}
        </main>
      </div>
    </div>
  )
}
