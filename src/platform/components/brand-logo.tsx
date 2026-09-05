import Image from "next/image"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  className?: string
}

export const BrandLogo = ({ className }: BrandLogoProps) => {
  return (
    <Image
      src="/icons/icon-192.png"
      alt="My OS"
      width={32}
      height={32}
      className={cn("size-8 rounded-md object-cover", className)}
      priority
    />
  )
}
