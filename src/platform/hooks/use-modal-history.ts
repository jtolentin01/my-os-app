"use client"

import { useEffect, useRef } from "react"

type UseModalHistoryArgs = {
  open: boolean
  onClose: () => void
  id: string
}

const modalStack: string[] = []
const skipPopIds = new Set<string>()

export const useModalHistory = ({ open, onClose, id }: UseModalHistoryArgs) => {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const onPopState = () => {
      if (skipPopIds.has(id)) {
        skipPopIds.delete(id)
        return
      }

      const top = modalStack[modalStack.length - 1]
      if (top !== id) return

      modalStack.pop()
      onCloseRef.current()
    }

    window.addEventListener("popstate", onPopState)
    return () => {
      window.removeEventListener("popstate", onPopState)
    }
  }, [id])

  useEffect(() => {
    if (open) {
      if (modalStack.includes(id)) return

      modalStack.push(id)
      window.history.pushState({ myOsModal: id }, "")
      return
    }

    const index = modalStack.lastIndexOf(id)
    if (index < 0) return

    const isTop = index === modalStack.length - 1
    modalStack.splice(index, 1)

    if (isTop && window.history.state?.myOsModal === id) {
      skipPopIds.add(id)
      window.history.back()
    }
  }, [open, id])

  useEffect(() => {
    return () => {
      const index = modalStack.lastIndexOf(id)
      if (index < 0) return

      const isTop = index === modalStack.length - 1
      modalStack.splice(index, 1)

      if (isTop && window.history.state?.myOsModal === id) {
        skipPopIds.add(id)
        window.history.back()
      }
    }
  }, [id])
}
