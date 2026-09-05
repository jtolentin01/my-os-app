"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Camera, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  removeAvatarAction,
  revalidateAvatarViewsAction,
  updateAvatarUrlAction,
} from "@/platform/profile/actions"
import {
  AVATAR_MAX_BYTES,
  PROFILE_AVATARS_BUCKET,
  getAvatarObjectPath,
  isAvatarMimeType,
} from "@/platform/profile/avatar"
import { UserAvatar } from "@/platform/profile/user-avatar"
import { Button } from "@/components/ui/button"

type AvatarUploaderProps = {
  userId: string
  displayName?: string | null
  avatarUrl?: string | null
}

export const AvatarUploader = ({
  userId,
  displayName,
  avatarUrl,
}: AvatarUploaderProps) => {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState(avatarUrl ?? null)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setPreviewUrl(avatarUrl ?? null)
  }, [avatarUrl])

  const clearInput = () => {
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError("")

    if (!isAvatarMimeType(file.type)) {
      setError("Use a JPG, PNG, or WebP image.")
      clearInput()
      return
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setError("Image must be 2MB or smaller.")
      clearInput()
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const path = getAvatarObjectPath(userId, file.type)

      const { data: existing, error: listError } = await supabase.storage
        .from(PROFILE_AVATARS_BUCKET)
        .list(userId)

      if (listError) {
        setError(listError.message)
        clearInput()
        return
      }

      const stalePaths = (existing ?? [])
        .filter((item) => item.name.startsWith("avatar."))
        .map((item) => `${userId}/${item.name}`)
        .filter((item) => item !== path)

      if (stalePaths.length > 0) {
        await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove(stalePaths)
      }

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_AVATARS_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        })

      if (uploadError) {
        setError(uploadError.message)
        clearInput()
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(PROFILE_AVATARS_BUCKET).getPublicUrl(path)

      const nextUrl = `${publicUrl}?v=${Date.now()}`

      const { data: saved, error: saveError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            avatar_url: nextUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select("avatar_url")
        .maybeSingle()

      if (saveError || !saved?.avatar_url) {
        const result = await updateAvatarUrlAction(nextUrl)
        if (result.error) {
          setError(result.error)
          clearInput()
          return
        }
      } else {
        await revalidateAvatarViewsAction()
      }

      setPreviewUrl(nextUrl)
      clearInput()
      router.refresh()
    })
  }

  const handleRemove = () => {
    setError("")
    startTransition(async () => {
      const result = await removeAvatarAction()
      if (result.error) {
        setError(result.error)
        return
      }
      setPreviewUrl(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <UserAvatar
          avatarUrl={previewUrl}
          displayName={displayName}
          size="lg"
          className="size-16"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WebP up to 2MB.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="size-3.5" />
              {previewUrl ? "Change photo" : "Upload photo"}
            </Button>
            {previewUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={handleRemove}
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
