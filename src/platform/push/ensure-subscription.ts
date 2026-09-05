"use client"

import { savePushSubscriptionAction } from "@/platform/push/actions"

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export const ensurePushSubscription = async () => {
  if (typeof window === "undefined") {
    return { error: "Push notifications are unavailable." }
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { error: "Push notifications are not supported on this device." }
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) {
    return { error: "Push notifications are not configured yet." }
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission()

  if (permission !== "granted") {
    return { error: "Notification permission is required for reminders." }
  }

  let registration = await navigator.serviceWorker.getRegistration()
  if (!registration) {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    })
  }
  await navigator.serviceWorker.ready

  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const payload = subscription.toJSON()
  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    return { error: "Failed to create push subscription." }
  }

  return savePushSubscriptionAction({
    endpoint: payload.endpoint,
    keys: {
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
    },
    userAgent: navigator.userAgent,
  })
}
