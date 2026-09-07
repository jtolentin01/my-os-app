export const CALL_FRAME_MAX_WIDTH = 640
export const CALL_FRAME_JPEG_QUALITY = 0.62

export const captureVideoFrameDataUrl = (
  video: HTMLVideoElement,
  options?: { maxWidth?: number; quality?: number }
) => {
  if (!video.videoWidth || !video.videoHeight) {
    return null
  }

  const maxWidth = options?.maxWidth ?? CALL_FRAME_MAX_WIDTH
  const quality = options?.quality ?? CALL_FRAME_JPEG_QUALITY
  const scale = Math.min(1, maxWidth / video.videoWidth)
  const width = Math.max(1, Math.round(video.videoWidth * scale))
  const height = Math.max(1, Math.round(video.videoHeight * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) return null

  context.drawImage(video, 0, 0, width, height)
  return canvas.toDataURL("image/jpeg", quality)
}
