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
          // Switched from `eleven_multilingual_v2` to `eleven_turbo_v2_5`
          // — Turbo v2.5 is ElevenLabs' current most-natural English /
          // multilingual model and produces noticeably less of the
          // "TTS robot" cadence users were complaining about. It's also
          // ~3× faster end-to-end, which the auto-read + Live voice
          // paths immediately benefit from.
          model_id: 'eleven_turbo_v2_5',
          // Tuned for "sounds like a person, not a narrator":
          //   • stability 0.35  — lower = more emotional/dynamic prosody.
          //                       Anything above ~0.6 starts to feel
          //                       monotone / read-aloud-textbook.
          //   • similarity 0.85 — keep the picked voice's identity
          //                       front-and-centre (otherwise Turbo
          //                       drifts toward a generic neutral voice).
          //   • style 0.25      — small style nudge: enough warmth to
          //                       feel conversational, not so much that
          //                       it over-acts on long sentences.
          //   • speaker_boost   — keeps the timbre punchy on phone
          //                       speakers, where Live mostly plays.
          voice_settings: {
            stability: 0.35,
            similarity_boost: 0.85,
            style: 0.25,
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
