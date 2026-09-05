"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { getAvatarInitials } from "@/platform/profile/avatar"
import { cn } from "@/lib/utils"

type UserAvatarProps = {
  avatarUrl?: string | null
  displayName?: string | null
  size?: "sm" | "default" | "lg"
  className?: string
}

export const UserAvatar = ({
  avatarUrl,
  displayName,
  size = "default",
  className,
}: UserAvatarProps) => {
  return (
    <Avatar size={size} className={cn(className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName || "Profile"} /> : null}
      <AvatarFallback>{getAvatarInitials(displayName)}</AvatarFallback>
    </Avatar>
  )
}
