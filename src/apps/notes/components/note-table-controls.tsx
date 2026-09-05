"use client"

import { useCallback, useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type HandleBox = {
  top: number
  left: number
}

type NoteTableControlsProps = {
  editor: Editor
  containerRef: React.RefObject<HTMLDivElement | null>
}

const findCellElement = (editor: Editor) => {
  const { view, state } = editor
  const $from = state.selection.$from

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      const pos = $from.before(depth)
      const dom = view.nodeDOM(pos)
      if (dom instanceof HTMLElement) {
        return dom.closest("td, th") as HTMLElement | null
      }
    }
  }

  return null
}

export const NoteTableControls = ({
  editor,
  containerRef,
}: NoteTableControlsProps) => {
  const [visible, setVisible] = useState(false)
  const [rowHandle, setRowHandle] = useState<HandleBox | null>(null)
  const [colHandle, setColHandle] = useState<HandleBox | null>(null)
  const [deleteHandle, setDeleteHandle] = useState<HandleBox | null>(null)

  const update = useCallback(() => {
    const container = containerRef.current
    if (!container || !editor.isActive("table")) {
      setVisible(false)
      return
    }

    const cell = findCellElement(editor)
    const table = cell?.closest("table")
    if (!cell || !table) {
      setVisible(false)
      return
    }

    const containerRect = container.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()
    const tableRect = table.getBoundingClientRect()

    setRowHandle({
      top: cellRect.top - containerRect.top + container.scrollTop + cellRect.height / 2,
      left: tableRect.left - containerRect.left + container.scrollLeft - 14,
    })
    setColHandle({
      top: tableRect.top - containerRect.top + container.scrollTop - 14,
      left: cellRect.left - containerRect.left + container.scrollLeft + cellRect.width / 2,
    })
    setDeleteHandle({
      top: tableRect.top - containerRect.top + container.scrollTop - 14,
      left: tableRect.right - containerRect.left + container.scrollLeft + 14,
    })
    setVisible(true)
  }, [containerRef, editor])

  useEffect(() => {
    const onUpdate = () => update()
    editor.on("selectionUpdate", onUpdate)
    editor.on("transaction", onUpdate)
    editor.on("focus", onUpdate)
    editor.on("blur", onUpdate)
    window.addEventListener("resize", onUpdate)

    const container = containerRef.current
    container?.addEventListener("scroll", onUpdate, true)

    onUpdate()

    return () => {
      editor.off("selectionUpdate", onUpdate)
      editor.off("transaction", onUpdate)
      editor.off("focus", onUpdate)
      editor.off("blur", onUpdate)
      window.removeEventListener("resize", onUpdate)
      container?.removeEventListener("scroll", onUpdate, true)
    }
  }, [containerRef, editor, update])

  if (!visible || !rowHandle || !colHandle || !deleteHandle) {
    return null
  }

  const handleClass = cn(
    "absolute z-20 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center",
    "rounded-md border border-white/15 bg-zinc-800/95 text-zinc-200 shadow-sm",
    "transition hover:bg-zinc-700 hover:text-white",
    "dark:border-white/20 dark:bg-zinc-800/95"
  )

  return (
    <>
      <button
        type="button"
        aria-label="Add row"
        className={handleClass}
        style={{ top: rowHandle.top, left: rowHandle.left }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        <Plus className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Add column"
        className={handleClass}
        style={{ top: colHandle.top, left: colHandle.left }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <Plus className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Delete table"
        className={handleClass}
        style={{ top: deleteHandle.top, left: deleteHandle.left }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        <Trash2 className="size-3.5" />
      </button>
    </>
  )
}
