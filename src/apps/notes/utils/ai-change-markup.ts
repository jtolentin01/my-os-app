const AI_CHANGE_ATTR = "data-ai-change"

export const stripAiChangeMarkup = (html?: string | null) => {
  if (!html) return ""
  return html.replace(/\s*data-ai-change="true"/gi, "")
}

const normalizeBlock = (html: string) =>
  stripAiChangeMarkup(html).replace(/\s+/g, " ").trim()

const splitTopLevelBlocks = (html: string) => {
  const trimmed = html.trim()
  if (!trimmed) return [] as string[]

  const doc = new DOMParser().parseFromString(
    `<div id="note-ai-root">${trimmed}</div>`,
    "text/html"
  )
  const root = doc.getElementById("note-ai-root")
  if (!root) return []

  return Array.from(root.childNodes)
    .map((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as Element).outerHTML
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        return text ? `<p>${text}</p>` : ""
      }
      return ""
    })
    .filter(Boolean)
}

const blockFingerprint = (html: string) => {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const element = doc.body.firstElementChild
  if (!element) {
    return normalizeBlock(html)
  }

  const tag = element.tagName.toLowerCase()
  const text = (element.textContent || "").replace(/\s+/g, " ").trim()
  return `${tag}:${text}`
}

const lcsUnchangedMask = (baseline: string[], next: string[]) => {
  const rows = baseline.length
  const cols = next.length
  const dp: number[][] = Array.from({ length: rows + 1 }, () =>
    Array.from({ length: cols + 1 }, () => 0)
  )

  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      if (baseline[i - 1] === next[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const unchanged = Array.from({ length: cols }, () => false)
  let i = rows
  let j = cols

  while (i > 0 && j > 0) {
    if (baseline[i - 1] === next[j - 1]) {
      unchanged[j - 1] = true
      i -= 1
      j -= 1
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1
    } else {
      j -= 1
    }
  }

  return unchanged
}

const addAiChangeAttr = (blockHtml: string) => {
  const doc = new DOMParser().parseFromString(blockHtml, "text/html")
  const element = doc.body.firstElementChild
  if (!element) return blockHtml
  element.setAttribute(AI_CHANGE_ATTR, "true")
  return element.outerHTML
}

export const markAiContentChanges = (
  baselineHtml: string,
  nextHtml: string
) => {
  const cleanNext = stripAiChangeMarkup(nextHtml)
  const nextBlocks = splitTopLevelBlocks(cleanNext)

  if (nextBlocks.length === 0) {
    return cleanNext
  }

  const baselineBlocks = splitTopLevelBlocks(
    stripAiChangeMarkup(baselineHtml)
  ).map(blockFingerprint)
  const nextNormalized = nextBlocks.map(blockFingerprint)

  if (baselineBlocks.length === 0) {
    return nextBlocks.map(addAiChangeAttr).join("")
  }

  const unchanged = lcsUnchangedMask(baselineBlocks, nextNormalized)

  return nextBlocks
    .map((block, index) =>
      unchanged[index] ? block : addAiChangeAttr(block)
    )
    .join("")
}

export const hasAiChangeMarkup = (html?: string | null) =>
  Boolean(html && /\sdata-ai-change="true"/i.test(html))
