import { redirect } from "next/navigation"
import { getAuthProfile } from "@/lib/supabase/auth"
import { AppShell } from "@/platform/components/app-shell"

const ShellLayout = async ({ children }: { children: React.ReactNode }) => {
  const auth = await getAuthProfile()

  if (!auth?.user) {
    redirect("/login")
  }

  const { user, profile } = auth
  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User"

  return (
    <AppShell
      userEmail={user.email}
      displayName={displayName}
      avatarUrl={profile?.avatar_url}
    >
      {children}
    </AppShell>
  )
}

export default ShellLayout
