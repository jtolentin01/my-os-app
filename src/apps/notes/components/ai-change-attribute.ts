import { Extension } from "@tiptap/core"

export const AiChangeAttribute = Extension.create({
  name: "aiChangeAttribute",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "blockquote",
          "bulletList",
          "orderedList",
          "listItem",
          "table",
          "tableRow",
          "tableCell",
          "tableHeader",
        ],
        attributes: {
          aiChange: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute("data-ai-change") === "true" ? "true" : null,
            renderHTML: (attributes) => {
              if (attributes.aiChange !== "true") {
                return {}
              }
              return { "data-ai-change": "true" }
            },
          },
        },
      },
    ]
  },
})
