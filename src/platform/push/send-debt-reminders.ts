import webpush from "web-push"
import { addDays, format, parse } from "date-fns"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatCalendarDay } from "@/apps/money/utils/month"
import { daysUntilDue } from "@/apps/money/utils/debt"

type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

type OpenDebt = {
  id: string
  user_id: string
  title: string
  counterparty: string
  next_due_on: string
  due_reminder_7d_for: string | null
  due_reminder_3d_for: string | null
  due_reminder_1d_for: string | null
  due_reminder_due_for: string | null
}

type DueMilestone = {
  field:
    | "due_reminder_7d_for"
    | "due_reminder_3d_for"
    | "due_reminder_1d_for"
    | "due_reminder_due_for"
  body: string
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

const parseCalendarDate = (isoDate: string) =>
  parse(isoDate, "yyyy-MM-dd", new Date())

const resolveMilestone = (debt: OpenDebt, today: string): DueMilestone | null => {
  const days = daysUntilDue(debt.next_due_on, today)
  if (days == null) return null

  const label = `${debt.title} (${debt.counterparty})`

  if (days === 7 && debt.due_reminder_7d_for !== debt.next_due_on) {
    return {
      field: "due_reminder_7d_for",
      body: `Due in 7 days: ${label}`,
    }
  }

  if (days === 3 && debt.due_reminder_3d_for !== debt.next_due_on) {
    return {
      field: "due_reminder_3d_for",
      body: `Due in 3 days: ${label}`,
    }
  }

  if (days === 1 && debt.due_reminder_1d_for !== debt.next_due_on) {
    return {
      field: "due_reminder_1d_for",
      body: `Due tomorrow: ${label}`,
    }
  }

  if (days <= 0 && debt.due_reminder_due_for !== debt.next_due_on) {
    return {
      field: "due_reminder_due_for",
      body:
        days === 0 ? `Due today: ${label}` : `Overdue: ${label}`,
    }
  }

  return null
}

export const sendDueDebtReminders = async () => {
  configureWebPush()
  const supabase = createAdminClient()
  const today = formatCalendarDay()
  const horizon = format(addDays(parseCalendarDate(today), 7), "yyyy-MM-dd")

  const { data: debts, error: debtsError } = await supabase
    .from("money_debts")
    .select(
      "id, user_id, title, counterparty, next_due_on, due_reminder_7d_for, due_reminder_3d_for, due_reminder_1d_for, due_reminder_due_for"
    )
    .eq("status", "open")
    .not("next_due_on", "is", null)
    .lte("next_due_on", horizon)
    .limit(200)

  if (debtsError) {
    throw new Error(debtsError.message)
  }

  const openDebts = (debts ?? []) as OpenDebt[]
  const dueItems = openDebts
    .map((debt) => {
      const milestone = resolveMilestone(debt, today)
      if (!milestone) return null
      return { debt, milestone }
    })
    .filter((item): item is { debt: OpenDebt; milestone: DueMilestone } =>
      Boolean(item)
    )

  if (dueItems.length === 0) {
    return { sent: 0, debts: 0 }
  }

  const userIds = [...new Set(dueItems.map((item) => item.debt.user_id))]
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
  let notified = 0

  for (const { debt, milestone } of dueItems) {
    const userSubscriptions = subscriptionsByUser.get(debt.user_id) ?? []
    if (userSubscriptions.length === 0) {
      continue
    }

    const payload = JSON.stringify({
      title: "Debt reminder",
      body: milestone.body,
      url: "/money?tab=debts",
      debtId: debt.id,
    })

    let delivered = false

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
        delivered = true
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

    if (!delivered) {
      continue
    }

    notified += 1

    await supabase
      .from("money_debts")
      .update({
        [milestone.field]: debt.next_due_on,
        updated_at: new Date().toISOString(),
      })
      .eq("id", debt.id)
  }

  return { sent, debts: notified }
}
