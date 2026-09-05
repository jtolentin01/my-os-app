export const CHAT_IMAGE_MAX_BYTES = 2 * 1024 * 1024

export const CHAT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type ChatImageMimeType = (typeof CHAT_IMAGE_MIME_TYPES)[number]

export const IMAGE_ONLY_USER_MESSAGE = "What's in this image?"

const DATA_URL_PATTERN =
  /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/

export const isChatImageMimeType = (
  value: string
): value is ChatImageMimeType =>
  (CHAT_IMAGE_MIME_TYPES as readonly string[]).includes(value)

export const estimateDataUrlBytes = (dataUrl: string) => {
  const match = DATA_URL_PATTERN.exec(dataUrl.trim())
  if (!match) return null

  const base64 = match[2]
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0
  return (base64.length * 3) / 4 - padding
}

export const isChatImageDataUrl = (value: string) => {
  const bytes = estimateDataUrlBytes(value)
  return bytes !== null && bytes > 0 && bytes <= CHAT_IMAGE_MAX_BYTES
}

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }
      reject(new Error("Failed to read image."))
    }
    reader.onerror = () => reject(new Error("Failed to read image."))
    reader.readAsDataURL(file)
  })
