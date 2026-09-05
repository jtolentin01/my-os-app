import { NextResponse } from "next/server"
import { sendDueMealReminders } from "@/platform/push/send-meal-reminders"

export const runtime = "nodejs"

const isAuthorized = (request: Request) => {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return false
  }

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

export const GET = async (request: Request) => {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sendDueMealReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send reminders.",
      },
      { status: 500 }
    )
  }
}
