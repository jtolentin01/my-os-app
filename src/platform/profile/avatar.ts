export const PROFILE_AVATARS_BUCKET = "profile-avatars"

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

export const AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number]

export const isAvatarMimeType = (value: string): value is AvatarMimeType =>
  (AVATAR_MIME_TYPES as readonly string[]).includes(value)

export const avatarExtensionForMime = (mime: AvatarMimeType) => {
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  return "jpg"
}

export const getAvatarObjectPath = (userId: string, mime: AvatarMimeType) =>
  `${userId}/avatar.${avatarExtensionForMime(mime)}`

export const getAvatarInitials = (name?: string | null) => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

export const isOwnedAvatarPublicUrl = (
  avatarUrl: string,
  userId: string,
  supabaseUrl: string
) => {
  try {
    const parsed = new URL(avatarUrl)
    const base = new URL(supabaseUrl)
    const prefix = `/storage/v1/object/public/${PROFILE_AVATARS_BUCKET}/${userId}/`
    return parsed.hostname === base.hostname && parsed.pathname.startsWith(prefix)
  } catch {
    return false
  }
}
