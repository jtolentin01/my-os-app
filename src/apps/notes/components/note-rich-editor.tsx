"use client"

import { useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import { TableKit } from "@tiptap/extension-table"
import { AiChangeAttribute } from "@/apps/notes/components/ai-change-attribute"
import { AiAwareTableView } from "@/apps/notes/components/ai-aware-table-view"
import {
  Bold,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react"
import { NoteTableControls } from "@/apps/notes/components/note-table-controls"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type NoteRichEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

type ToolbarButtonProps = {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

const ToolbarButton = ({
  label,
  active,
  disabled,
  onClick,
  children,
}: ToolbarButtonProps) => {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      className="shrink-0"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

const normalizeLinkUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export const NoteRichEditor = ({
  value,
  onChange,
  placeholder = "Write your note...",
}: NoteRichEditorProps) => {
  const surfaceRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      AiChangeAttribute,
      Underline,
      Highlight.configure({
        multicolor: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      TableKit.configure({
        table: {
          resizable: false,
          HTMLAttributes: {
            class: "note-table",
          },
          View: AiAwareTableView,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "note-editor break-words px-1 py-1 text-sm outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value === current) return
    editor.commands.setContent(value || "", { emitUpdate: false })
  }, [editor, value])

  if (!editor) {
    return (
      <div className="min-h-40 min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 sm:min-h-48" />
    )
  }

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined
    const next = window.prompt("Enter link URL", previous ?? "https://")
    if (next === null) return

    const url = normalizeLinkUrl(next)
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-input bg-transparent">
      <div className="flex min-w-0 flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Highlight"
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="size-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          <Link2 className="size-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />

        <ToolbarButton
          label="Insert table"
          active={editor.isActive("table")}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 2, cols: 2, withHeaderRow: false })
              .run()
          }
        >
          <Table2 className="size-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />

        <ToolbarButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-3.5" />
        </ToolbarButton>
      </div>

      <div
        ref={surfaceRef}
        className="relative min-h-40 max-h-64 overflow-x-auto overflow-y-auto px-8 pt-8 pb-3 sm:min-h-48 sm:max-h-80"
      >
        <EditorContent editor={editor} className="min-w-0 max-w-full" />
        <NoteTableControls editor={editor} containerRef={surfaceRef} />
      </div>
    </div>
  )
}
