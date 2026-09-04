"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const emptySubscribe = () => () => {}

const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

const isStandaloneDisplay = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))

export const InstallAppCard = () => {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const standalone = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {}
      const media = window.matchMedia("(display-mode: standalone)")
      media.addEventListener("change", onStoreChange)
      return () => media.removeEventListener("change", onStoreChange)
    },
    isStandaloneDisplay,
    () => false
  )
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null
  )
  const [justInstalled, setJustInstalled] = useState(false)

  useEffect(() => {
    if (!mounted) return

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      setJustInstalled(true)
      setInstallEvent(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
    }
  }, [mounted])

  if (!mounted) {
    return <div className="h-10 rounded-lg bg-muted/30" />
  }

  if (standalone || justInstalled) {
    return (
      <p className="text-sm text-muted-foreground">
        My OS is installed on this device.
      </p>
    )
  }

  if (installEvent) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Install My OS for a full-screen app experience without the browser chrome.
        </p>
        <Button
          type="button"
          className="w-fit"
          onClick={async () => {
            await installEvent.prompt()
            const choice = await installEvent.userChoice
            if (choice.outcome === "accepted") {
              setJustInstalled(true)
            }
            setInstallEvent(null)
          }}
        >
          <Download className="size-4" />
          Install app
        </Button>
      </div>
    )
  }

  if (isIos()) {
    return (
      <p className="text-sm text-muted-foreground">
        On iPhone, open this site in Safari, tap Share, then Add to Home Screen.
      </p>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      Use your browser menu and choose Install app after this page finishes loading.
      Delete any old Chrome shortcut first, then install again.
    </p>
  )
}
