"use client"

import { useMemo } from "react"
import { renderChatMarkdown } from "@/apps/chat/utils/markdown"
import { cn } from "@/lib/utils"

type ChatMarkdownProps = {
  content: string
  className?: string
}

export const ChatMarkdown = ({ content, className }: ChatMarkdownProps) => {
  const html = useMemo(() => renderChatMarkdown(content), [content])

  if (!html) return null

  return (
    <div
      className={cn(
        "chat-markdown [&_ol]:list-decimal [&_ul]:list-disc [&_li]:my-0.5",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
