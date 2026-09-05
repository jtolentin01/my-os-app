"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  PROFILE_AVATARS_BUCKET,
  isOwnedAvatarPublicUrl,
} from "@/platform/profile/avatar"

const revalidateProfileViews = () => {
  revalidatePath("/", "layout")
  revalidatePath("/settings")
}

export const revalidateAvatarViewsAction = async () => {
  revalidateProfileViews()
}

export const updateAvatarUrlAction = async (
  avatarUrl: string
): Promise<{ error?: string; success?: boolean }> => {
  const trimmed = avatarUrl.trim()
  if (!trimmed) {
    return { error: "Avatar URL is required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  if (!isOwnedAvatarPublicUrl(trimmed, user.id, supabaseUrl)) {
    return { error: "Invalid avatar URL." }
  }

  const displayName =
    (typeof user.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name) ||
    user.email?.split("@")[0] ||
    null

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: displayName,
        avatar_url: trimmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("avatar_url")
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  if (!data?.avatar_url) {
    return { error: "Failed to save profile photo." }
  }

  revalidateProfileViews()
  return { success: true }
}

export const removeAvatarAction = async (): Promise<{
  error?: string
  success?: boolean
}> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: files, error: listError } = await supabase.storage
    .from(PROFILE_AVATARS_BUCKET)
    .list(user.id)

  if (listError) {
    return { error: listError.message }
  }

  const paths = (files ?? [])
    .filter((file) => file.name.startsWith("avatar."))
    .map((file) => `${user.id}/${file.name}`)
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(PROFILE_AVATARS_BUCKET)
      .remove(paths)

    if (removeError) {
      return { error: removeError.message }
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("id, avatar_url")
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: "Failed to update profile." }
  }

  revalidateProfileViews()
  return { success: true }
}
