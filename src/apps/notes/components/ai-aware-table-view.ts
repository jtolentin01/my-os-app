import { TableView } from "@tiptap/extension-table"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import type { EditorView } from "@tiptap/pm/view"

const syncAiChangeAttr = (
  table: HTMLTableElement,
  wrapper: HTMLElement,
  node: ProseMirrorNode
) => {
  if (node.attrs.aiChange === "true") {
    table.setAttribute("data-ai-change", "true")
    wrapper.setAttribute("data-ai-change", "true")
    return
  }

  table.removeAttribute("data-ai-change")
  wrapper.removeAttribute("data-ai-change")
}

export class AiAwareTableView extends TableView {
  constructor(
    node: ProseMirrorNode,
    cellMinWidth: number,
    view?: EditorView,
    HTMLAttributes: Record<string, unknown> = {}
  ) {
    const attributes = { ...HTMLAttributes }

    if (node.attrs.aiChange === "true") {
      attributes["data-ai-change"] = "true"
    }

    super(node, cellMinWidth, view, attributes)
    syncAiChangeAttr(this.table, this.dom, node)
  }

  update(node: ProseMirrorNode) {
    const updated = super.update(node)
    if (!updated) {
      return false
    }

    syncAiChangeAttr(this.table, this.dom, node)
    return true
  }
}
