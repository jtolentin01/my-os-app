import Link from "next/link"
import {
  getLatestReport,
  getLifeProfile,
  listRecentReports,
} from "@/platform/life/services"
import { ChatMarkdown } from "@/apps/chat/components/chat-markdown"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const statusLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const ReportsPage = async () => {
  let profile = null
  let latestReport = null
  let reports: Awaited<ReturnType<typeof listRecentReports>> = []

  try {
    ;[profile, latestReport, reports] = await Promise.all([
      getLifeProfile(),
      getLatestReport(),
      listRecentReports(12),
    ])
  } catch {
    profile = null
    latestReport = null
    reports = []
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Life reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your living foundation across health, diet, money, and notes.
          </p>
        </div>
        <Link
          href="/settings"
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
        >
          Report settings
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foundation</CardTitle>
          <CardDescription>
            {profile
              ? `Updated ${new Date(profile.generated_at).toLocaleString()} · ${profile.confidence} confidence`
              : "Generate a report from Settings to build this portrait."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          {profile ? (
            <>
              <p>{profile.portrait_summary}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Health: {statusLabel(profile.health.status)}
                </Badge>
                <Badge variant="secondary">
                  Diet: {statusLabel(profile.diet.status)}
                </Badge>
                <Badge variant="secondary">
                  Money: {statusLabel(profile.money.status)}
                </Badge>
                <Badge variant="secondary">Notes</Badge>
              </div>
              {profile.priorities.length > 0 ? (
                <div>
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    Priorities
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {profile.priorities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profile.risks.length > 0 ? (
                <div>
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    Risks
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {profile.risks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">
              No foundation yet. Open Settings and use Generate now.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest report</CardTitle>
          <CardDescription>
            {latestReport
              ? `${latestReport.period_start} to ${latestReport.period_end}`
              : "No reports generated yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestReport ? (
            <ChatMarkdown content={latestReport.content} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Scheduled or manual generation will appear here.
            </p>
          )}
        </CardContent>
      </Card>

      {reports.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Recent generated digests</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="rounded-lg border border-border/70 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {report.cadence}
                  </Badge>
                  <span className="text-muted-foreground">
                    {report.period_start} → {report.period_end}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-muted-foreground">
                  {report.content.replace(/[#>*_`]/g, "").slice(0, 160)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export default ReportsPage
