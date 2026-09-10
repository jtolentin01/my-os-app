import {
  getCallNoiseMode,
  type CallNoiseMode,
} from "@/apps/call/lib/noise-mode"
import { executeCallToolAction } from "@/apps/call/services/actions"

export type CallStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "tool"
  | "ended"
  | "error"

export type RealtimeSessionHandlers = {
  onStatus?: (status: CallStatus) => void
  onError?: (message: string, fatal?: boolean) => void
  onTranscript?: (role: "user" | "assistant", text: string) => void
  onToolSummary?: (summary: string) => void
}

type SessionTokenResponse = {
  clientSecret?: string
  error?: string
}

type FunctionCallItem = {
  type?: string
  name?: string
  call_id?: string
  arguments?: string
}

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls"

const parseJson = (raw: string) => {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

const micConstraintsForMode = (noiseMode: CallNoiseMode): MediaTrackConstraints => {
  const outdoor = noiseMode === "outdoor"
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    ...(outdoor
      ? {
          channelCount: 1,
        }
      : {}),
  }
}

export class RealtimeCallSession {
  private pc: RTCPeerConnection | null = null
  private dc: RTCDataChannel | null = null
  private localStream: MediaStream | null = null
  private cameraStream: MediaStream | null = null
  private remoteAudio: HTMLAudioElement | null = null
  private handlers: RealtimeSessionHandlers
  private closed = false
  private muted = false
  private cameraEnabled = false
  private noiseMode: CallNoiseMode = "quiet"
  private toolQueue: Promise<void> = Promise.resolve()
  private videoElement: HTMLVideoElement | null = null
  private captureFrame: (() => string | null) | null = null

  constructor(handlers: RealtimeSessionHandlers = {}) {
    this.handlers = handlers
  }

  get isMuted() {
    return this.muted
  }

  get isCameraEnabled() {
    return this.cameraEnabled
  }

  get currentNoiseMode() {
    return this.noiseMode
  }

  async start(options: {
    cameraEnabled: boolean
    noiseMode: CallNoiseMode
    startMuted?: boolean
  }) {
    this.closed = false
    this.cameraEnabled = options.cameraEnabled
    this.noiseMode = options.noiseMode
    this.handlers.onStatus?.("connecting")

    const tokenResponse = await fetch("/api/realtime/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cameraEnabled: options.cameraEnabled,
        noiseMode: options.noiseMode,
      }),
    })

    let tokenPayload: SessionTokenResponse = {}
    try {
      tokenPayload = (await tokenResponse.json()) as SessionTokenResponse
    } catch {
      throw new Error("Could not start the call session.")
    }

    if (!tokenResponse.ok || !tokenPayload.clientSecret) {
      throw new Error(tokenPayload.error || "Could not start the call session.")
    }

    const pc = new RTCPeerConnection()
    this.pc = pc

    pc.onconnectionstatechange = () => {
      if (this.closed) return
      if (pc.connectionState === "failed") {
        this.handlers.onError?.("The call connection was lost.", true)
      }
    }

    const remoteAudio = document.createElement("audio")
    remoteAudio.autoplay = true
    remoteAudio.setAttribute("playsinline", "true")
    this.remoteAudio = remoteAudio

    pc.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0] ?? null
      void remoteAudio.play().catch(() => {})
    }

    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: micConstraintsForMode(options.noiseMode),
    })
    this.localStream = micStream
    for (const track of micStream.getAudioTracks()) {
      pc.addTrack(track, micStream)
    }

    if (options.startMuted) {
      this.setMuted(true)
    }

    if (options.cameraEnabled) {
      await this.enableCameraTracks()
    }

    const dc = pc.createDataChannel("oai-events")
    this.dc = dc
    dc.addEventListener("open", () => {
      this.handlers.onStatus?.("listening")
      this.sendEvent({ type: "response.create" })
      if (this.cameraEnabled) {
        this.sendCameraFrame()
      }
    })
    dc.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return
      this.handleServerEvent(event.data)
    })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const sdpResponse = await fetch(REALTIME_CALLS_URL, {
      method: "POST",
      body: offer.sdp ?? "",
      headers: {
        Authorization: `Bearer ${tokenPayload.clientSecret}`,
        "Content-Type": "application/sdp",
      },
    })

    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text()
      throw new Error(errorText || "Failed to connect the realtime call.")
    }

    const answerSdp = await sdpResponse.text()
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp })
  }

  setMuted(muted: boolean) {
    this.muted = muted
    for (const track of this.localStream?.getAudioTracks() ?? []) {
      track.enabled = !muted
    }
  }

  setNoiseMode(mode: CallNoiseMode) {
    if (mode === this.noiseMode) return
    this.noiseMode = mode
    const noise = getCallNoiseMode(mode)

    this.sendEvent({
      type: "session.update",
      session: {
        type: "realtime",
        audio: {
          input: {
            noise_reduction: {
              type: noise.noiseReduction,
            },
            turn_detection: {
              type: "server_vad",
              silence_duration_ms: noise.silenceDurationMs,
              prefix_padding_ms: 300,
              threshold: noise.vadThreshold,
              interrupt_response: true,
            },
          },
        },
      },
    })
  }

  async setCameraEnabled(enabled: boolean) {
    if (enabled === this.cameraEnabled) return
    this.cameraEnabled = enabled

    if (!enabled) {
      this.stopCameraTracks()
      return
    }

    await this.enableCameraTracks()

    if (!this.cameraEnabled || this.closed) {
      this.stopCameraTracks()
      return
    }

    if (this.dc?.readyState === "open") {
      this.sendCameraFrame()
    }
  }

  attachPreview(video: HTMLVideoElement | null) {
    this.videoElement = video
    if (!video || !this.cameraStream) return

    if (video.srcObject !== this.cameraStream) {
      video.srcObject = this.cameraStream
    }

    if (video.paused) {
      void video.play().catch(() => {})
    }
  }

  setFrameCapture(capture: (() => string | null) | null) {
    this.captureFrame = capture
  }

  stop() {
    this.closed = true
    this.handlers.onStatus?.("ended")

    try {
      this.dc?.close()
    } catch {}
    this.dc = null

    try {
      this.pc?.getSenders().forEach((sender) => {
        try {
          sender.track?.stop()
        } catch {}
      })
      this.pc?.close()
    } catch {}
    this.pc = null

    this.stopCameraTracks()

    for (const track of this.localStream?.getTracks() ?? []) {
      track.stop()
    }
    this.localStream = null

    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null
      this.remoteAudio = null
    }
  }

  private async enableCameraTracks() {
    if (this.cameraStream) {
      this.attachPreview(this.videoElement)
      return
    }

    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })
    this.cameraStream = cameraStream
    this.attachPreview(this.videoElement)
  }

  private stopCameraTracks() {
    for (const track of this.cameraStream?.getTracks() ?? []) {
      track.stop()
    }
    this.cameraStream = null
    if (this.videoElement && this.videoElement.srcObject) {
      this.videoElement.srcObject = null
    }
  }

  private sendCameraFrame() {
    if (this.closed || !this.cameraEnabled || this.dc?.readyState !== "open") {
      return
    }

    const dataUrl = this.captureFrame?.()
    if (!dataUrl) return

    this.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: dataUrl,
          },
        ],
      },
    })
  }

  private sendEvent(event: Record<string, unknown>) {
    if (this.dc?.readyState !== "open") return
    this.dc.send(JSON.stringify(event))
  }

  private handleServerEvent(raw: string) {
    const event = parseJson(raw)
    if (!event || typeof event.type !== "string") return

    switch (event.type) {
      case "input_audio_buffer.speech_started":
        this.handlers.onStatus?.("listening")
        if (this.cameraEnabled) {
          this.sendCameraFrame()
        }
        break
      case "input_audio_buffer.speech_stopped":
        this.handlers.onStatus?.("listening")
        break
      case "response.created":
        this.handlers.onStatus?.("speaking")
        break
      case "response.done":
        this.handleResponseDone(event)
        break
      case "conversation.item.input_audio_transcription.completed": {
        const transcript =
          typeof event.transcript === "string" ? event.transcript.trim() : ""
        if (transcript) {
          this.handlers.onTranscript?.("user", transcript)
        }
        break
      }
      case "response.audio_transcript.done": {
        const transcript =
          typeof event.transcript === "string" ? event.transcript.trim() : ""
        if (transcript) {
          this.handlers.onTranscript?.("assistant", transcript)
        }
        break
      }
      case "error": {
        const error = event.error as { message?: string } | undefined
        this.handlers.onError?.(error?.message || "Call error.", false)
        break
      }
      default:
        break
    }
  }

  private handleResponseDone(event: Record<string, unknown>) {
    const response = event.response as
      | { status?: string; output?: FunctionCallItem[] }
      | undefined

    if (response?.status === "cancelled" || response?.status === "failed") {
      if (!this.closed) {
        this.handlers.onStatus?.("listening")
      }
      return
    }

    const output = response?.output ?? []
    const functionCalls = output.filter(
      (item): item is FunctionCallItem & { call_id: string; name: string } =>
        item?.type === "function_call" &&
        typeof item.call_id === "string" &&
        typeof item.name === "string"
    )

    if (functionCalls.length === 0) {
      if (!this.closed) {
        this.handlers.onStatus?.("listening")
      }
      return
    }

    this.handlers.onStatus?.("tool")
    this.toolQueue = this.toolQueue
      .then(() => this.runFunctionCalls(functionCalls))
      .catch((error) => {
        this.handlers.onError?.(
          error instanceof Error ? error.message : "Tool execution failed.",
          false
        )
        if (!this.closed) {
          this.handlers.onStatus?.("listening")
        }
      })
  }

  private async runFunctionCalls(
    calls: Array<FunctionCallItem & { call_id: string; name: string }>
  ) {
    for (const call of calls) {
      const result = await executeCallToolAction({
        name: call.name,
        argumentsJson: call.arguments || "{}",
      })

      this.handlers.onToolSummary?.(result.summary)

      this.sendEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(result),
        },
      })
    }

    if (!this.closed) {
      this.sendEvent({ type: "response.create" })
    }
  }
}
