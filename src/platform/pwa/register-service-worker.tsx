"use client"

import { useEffect } from "react"

export const RegisterServiceWorker = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return
    }

    if (!("serviceWorker" in navigator)) {
      return
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
      } catch {}
    }

    void register()
  }, [])

  return null
}
