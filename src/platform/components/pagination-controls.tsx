import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PaginationControlsProps = {
  page: number
  totalPages: number
  hrefForPage: (page: number) => string
  className?: string
}

export const PaginationControls = ({
  page,
  totalPages,
  hrefForPage,
  className,
}: PaginationControlsProps) => {
  if (totalPages <= 1) {
    return null
  }

  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3",
        "pr-[4.75rem] pb-1",
        className
      )}
    >
      {hasPrev ? (
        <Link
          href={hrefForPage(page - 1)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Previous
        </Link>
      ) : (
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-none opacity-50"
          )}
        >
          Previous
        </span>
      )}
      <span className="shrink-0 px-1 text-sm font-medium tabular-nums text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {hasNext ? (
        <Link
          href={hrefForPage(page + 1)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Next
        </Link>
      ) : (
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-none opacity-50"
          )}
        >
          Next
        </span>
      )}
    </div>
  )
}
