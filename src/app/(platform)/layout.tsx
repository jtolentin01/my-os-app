import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/platform/components/app-shell"

const PlatformLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle()

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User"

  return (
    <AppShell userEmail={user.email} displayName={displayName}>
      {children}
    </AppShell>
  )
}

export default PlatformLayout
