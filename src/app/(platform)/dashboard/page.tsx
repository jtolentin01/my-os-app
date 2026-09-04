import Link from "next/link"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { getEnabledApps } from "@/platform/config/apps.registry"
import { getOrCreateMealPlan } from "@/apps/diet/services/meals"
import { formatWeekRange } from "@/apps/diet/utils/week"
import { getRecentNotes } from "@/apps/notes/services/notes"
import { toPlainNoteText } from "@/apps/notes/utils/content"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const DashboardPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .maybeSingle()

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "there"

  let mealCount = 0
  let weekLabel = ""
  let recentNotes: Awaited<ReturnType<typeof getRecentNotes>> = []

  try {
    const plan = await getOrCreateMealPlan()
    mealCount = plan.meals.length
    weekLabel = formatWeekRange(plan.week_start)
  } catch {
    mealCount = 0
  }

  try {
    recentNotes = await getRecentNotes(3)
  } catch {
    recentNotes = []
  }

  const apps = getEnabledApps()
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {greeting}, {displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          This is your personal operating system. Diet and Notes are available now — more life
          apps will plug into this same space.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>This week&apos;s meals</CardTitle>
            <CardDescription>{weekLabel || "Current week"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-3xl font-semibold tracking-tight">{mealCount}</p>
            <p className="text-sm text-muted-foreground">
              {mealCount === 0
                ? "No dishes planned yet. Start your weekly meal plan."
                : "Dishes planned across your week."}
            </p>
            <Link href="/diet" className={cn(buttonVariants(), "w-fit")}>
              Open Diet
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent notes</CardTitle>
            <CardDescription>Your latest captured thoughts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notes yet. Capture an idea in Notes.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentNotes.map((note) => {
                  const preview = toPlainNoteText(note.content)
                  return (
                  <div key={note.id} className="rounded-lg border px-3 py-2">
                    <p className="truncate text-sm font-medium">{note.title}</p>
                    {preview ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {preview}
                      </p>
                    ) : null}
                  </div>
                  )
                })}
              </div>
            )}
            <Link href="/notes" className={cn(buttonVariants(), "w-fit")}>
              Open Notes
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Installed apps</CardTitle>
            <CardDescription>Modules available in your My OS</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {apps.map((app) => {
              const Icon = app.icon
              return (
                <Link
                  key={app.id}
                  href={app.href}
                  className="flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.description}</p>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
