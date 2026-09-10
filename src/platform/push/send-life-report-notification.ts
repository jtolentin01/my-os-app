import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"

type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

const configureWebPush = () => {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@my-os.app"

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID keys.")
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export const sendLifeReportNotification = async (input: {
  userId: string
  title: string
  body: string
  reportId?: string
}) => {
  configureWebPush()
  const supabase = createAdminClient()

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("user_id", input.userId)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (subscriptions ?? []) as PushSubscriptionRow[]
  if (rows.length === 0) {
    return { sent: 0, subscriptions: 0 }
  }

  const body = input.body.trim().slice(0, 160)
  const payload = JSON.stringify({
    title: input.title.trim().slice(0, 80) || "Life report ready",
    body: body || "Your life report is ready.",
    url: "/reports",
    reportId: input.reportId,
  })

  let sent = 0

  for (const subscription of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload
      )
      sent += 1
    } catch (error) {
      const statusCode =
        typeof error === "object" && error && "statusCode" in error
          ? Number(error.statusCode)
          : 0

      if (statusCode === 404 || statusCode === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", subscription.id)
      }
    }
  }

  return { sent, subscriptions: rows.length }
}
