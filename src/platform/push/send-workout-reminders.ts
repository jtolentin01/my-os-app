import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"

type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

type DueWorkout = {
  id: string
  user_id: string
  title: string
  workout_type: string
  remind_at: string
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

export const sendDueWorkoutReminders = async () => {
  configureWebPush()
  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: workouts, error: workoutsError } = await supabase
    .from("health_workouts")
    .select("id, user_id, title, workout_type, remind_at")
    .eq("status", "planned")
    .not("remind_at", "is", null)
    .is("reminder_sent_at", null)
    .lte("remind_at", nowIso)
    .limit(100)

  if (workoutsError) {
    throw new Error(workoutsError.message)
  }

  const dueWorkouts = (workouts ?? []) as DueWorkout[]
  if (dueWorkouts.length === 0) {
    return { sent: 0, workouts: 0 }
  }

  const userIds = [...new Set(dueWorkouts.map((workout) => workout.user_id))]
  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds)

  if (subscriptionsError) {
    throw new Error(subscriptionsError.message)
  }

  const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>()
  for (const subscription of (subscriptions ?? []) as PushSubscriptionRow[]) {
    const current = subscriptionsByUser.get(subscription.user_id) ?? []
    current.push(subscription)
    subscriptionsByUser.set(subscription.user_id, current)
  }

  let sent = 0

  for (const workout of dueWorkouts) {
    const userSubscriptions = subscriptionsByUser.get(workout.user_id) ?? []
    const payload = JSON.stringify({
      title: "Workout reminder",
      body: `${workout.workout_type}: ${workout.title}`,
      url: "/health?tab=workouts",
      workoutId: workout.id,
    })

    for (const subscription of userSubscriptions) {
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

    await supabase
      .from("health_workouts")
      .update({ reminder_sent_at: nowIso })
      .eq("id", workout.id)
  }

  return { sent, workouts: dueWorkouts.length }
}
