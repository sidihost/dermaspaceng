import { NextRequest, NextResponse } from 'next/server'
import { resolveLiveVoice } from '@/lib/derma-live-voices'

/**
 * POST /api/voice
 *
 * Text-to-speech endpoint for Derma AI's auto-read, per-message Speak
 * button, and the Derma AI Live voice-to-voice mode.
 *
 * Body:
 *   text:    string    — the text to synthesize.
 *   voice?:  string    — either a catalog slug ("adunni") or a raw
 *                        ElevenLabs voice id. Falls back to the
 *                        default Derma Live voice if missing / unknown.
 *
 * The previous version hard-coded a single voice id, which meant the
 * shiny new picker in the UI had nothing to actually change. The
 * resolver on the shared catalog is the single source of truth for
 * what each slug maps to, both client-side (for preview rendering)
 * and server-side (for the upstream call).
 */
export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 })
    }

    const resolved = resolveLiveVoice(typeof voice === 'string' ? voice : null)
    const voiceId = resolved.elevenLabsVoiceId

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs error:', error)
      return NextResponse.json({ error: 'Voice generation failed' }, { status: 500 })
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        // Small CDN hint — previews are deterministic per (text, voice)
        // so we let the browser cache them briefly. The picker reloads
        // the same preview text each time a card is tapped, and this
        // trims the second tap down to ~0ms.
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('Voice API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
