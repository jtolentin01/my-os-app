import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
})

export const getCurrentUserId = cache(async () => {
  const user = await getAuthUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  return user.id
})

export const getAuthProfile = cache(async () => {
  const user = await getAuthUser()

  if (!user) {
    return null
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle()

  return { user, profile }
})
