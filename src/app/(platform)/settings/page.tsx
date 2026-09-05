import { createClient } from "@/lib/supabase/server"
import { ThemeSelector } from "@/platform/theme/theme-selector"
import { AccentSelector } from "@/platform/theme/accent-selector"
import { InstallAppCard } from "@/platform/pwa/install-app-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const SettingsPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, created_at")
    .eq("id", user!.id)
    .maybeSingle()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your My OS profile and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details in this personal system</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="flex items-center justify-between gap-4 border-b pb-3">
            <span className="text-muted-foreground">Display name</span>
            <span className="font-medium">
              {profile?.display_name ||
                user?.user_metadata?.display_name ||
                user?.email?.split("@")[0]}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b pb-3">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how My OS looks on this device. Your choice is saved locally.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Theme</p>
            <ThemeSelector />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Accent color</p>
            <AccentSelector />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install app</CardTitle>
          <CardDescription>
            Add My OS to your home screen so it opens like a standalone app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstallAppCard />
        </CardContent>
      </Card>
    </div>
  )
}

export default SettingsPage
