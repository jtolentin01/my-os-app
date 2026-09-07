import Image from "next/image"
import { cn } from "@/lib/utils"

export const ASSISTANT_AVATAR_SRC = "/assets/AI-assistant.png"

type AssistantAvatarProps = {
  className?: string
  priority?: boolean
  alt?: string
}

export const AssistantAvatar = ({
  className,
  priority = false,
  alt = "My OS assistant",
}: AssistantAvatarProps) => {
  return (
    <Image
      src={ASSISTANT_AVATAR_SRC}
      alt={alt}
      width={384}
      height={384}
      className={cn("size-full object-cover", className)}
      priority={priority}
    />
  )
}
