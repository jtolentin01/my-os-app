"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId } from "@/apps/diet/services/meals"

type PushSubscriptionInput = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
}

export const savePushSubscriptionAction = async (
  subscription: PushSubscriptionInput
) => {
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { error: "Invalid push subscription." }
  }

  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: subscription.userAgent || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" }
    )

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to save push subscription.",
    }
  }
}
