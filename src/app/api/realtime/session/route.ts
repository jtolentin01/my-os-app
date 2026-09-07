import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { getCallNoiseMode } from "@/apps/call/lib/noise-mode"
import { getOpenAIClient } from "@/platform/ai/client"
import { buildRealtimeInstructions } from "@/platform/ai/realtime/instructions"
import {
  resolveRealtimeModel,
  resolveRealtimeVoice,
} from "@/platform/ai/realtime/models"
import { getRealtimeToolDefinitions } from "@/platform/ai/realtime/tools"
import {
  formatMemoriesForPrompt,
  listMemories,
} from "@/platform/memory/services"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type SessionBody = {
  cameraEnabled?: boolean
  noiseMode?: string
}

export const POST = async (request: Request) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "OpenAI is not configured." },
      { status: 503 }
    )
  }

  let body: SessionBody = {}
  try {
    body = (await request.json()) as SessionBody
  } catch {
    body = {}
  }

  const cameraEnabled = Boolean(body.cameraEnabled)
  const noise = getCallNoiseMode(body.noiseMode)

  let memoryBlock = "No lasting personal facts saved yet."
  try {
    const memories = await listMemories(80)
    memoryBlock = formatMemoriesForPrompt(memories)
  } catch {}

  const safetyIdentifier = createHash("sha256")
    .update(user.id)
    .digest("hex")

  try {
    const client = getOpenAIClient()
    const secret = await client.realtime.clientSecrets.create(
      {
        expires_after: {
          anchor: "created_at",
          seconds: 60,
        },
        session: {
          type: "realtime",
          model: resolveRealtimeModel(),
          instructions: buildRealtimeInstructions({
            memoryBlock,
            cameraEnabled,
          }),
          audio: {
            output: {
              voice: resolveRealtimeVoice(),
            },
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
          output_modalities: ["audio"],
          tools: getRealtimeToolDefinitions({ allowSaveMemory: true }),
          tool_choice: "auto",
        },
      },
      {
        headers: {
          "OpenAI-Safety-Identifier": safetyIdentifier,
        },
      }
    )

    return NextResponse.json({
      clientSecret: secret.value,
      expiresAt: secret.expires_at,
      model: resolveRealtimeModel(),
      noiseMode: noise.id,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start call session."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
