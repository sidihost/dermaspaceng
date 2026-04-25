import { NextRequest, NextResponse } from 'next/server'
import { Mistral } from '@mistralai/mistralai'
import { resolveLiveVoice } from '@/lib/derma-live-voices'

/**
 * POST /api/voice
 *
 * Text-to-speech endpoint for Derma AI's auto-read, per-message Speak
 * button, and the Derma AI Live voice-to-voice mode.
 *
 * Now backed by Mistral's Voxtral TTS (`voxtral-mini-tts-2603`)
 * instead of ElevenLabs — same Mistral org as our STT (Voxtral) and
 * vision (Pixtral) chains, so the whole AI stack runs against a
 * single API key (`MISTRAL_API_KEY`). The catalog in
 * `lib/derma-live-voices.ts` maps each Derma voice slug to a Mistral
 * `voiceId` (UUID); the resolver here is the single source of truth
 * for that lookup, both client-side (preview rendering) and
 * server-side (this route).
 *
 * Body:
 *   text:    string  — the text to synthesize.
 *   voice?:  string  — either a catalog slug ("joshua" / "juwon") or
 *                      a raw Mistral voiceId UUID. Falls back to the
 *                      default Derma Live voice if missing/unknown.
 */

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Voice generation not configured. Set MISTRAL_API_KEY.' },
        { status: 503 },
      )
    }

    const resolved = resolveLiveVoice(typeof voice === 'string' ? voice : null)
    const client = new Mistral({ apiKey })

    // Mistral TTS: Voxtral mini handles English + heavy accents
    // (including Nigerian English) noticeably better than the
    // generic ElevenLabs multilingual we used previously.
    //
    // The Mistral SDK returns the audio as a base64 string under
    // `audioData`, regardless of `responseFormat`. We re-encode to a
    // raw Buffer below before streaming it back to the browser as
    // `audio/mpeg` so existing <audio> elements in the chat keep
    // working without code changes on the client side.
    const audio = await client.audio.speech.complete({
      model: 'voxtral-mini-tts-2603',
      input: text.slice(0, 4000), // safety cap matches our TTS budget
      responseFormat: 'mp3',
      stream: false,
      voiceId: resolved.mistralVoiceId,
    })

    // The SDK shape is `{ audioData: string }` for non-streaming
    // requests; if Mistral ever switches to a binary response we
    // fall through to a generic decode so the route doesn't break.
    const audioData =
      (audio as unknown as { audioData?: string }).audioData ??
      (audio as unknown as { audio?: string }).audio
    if (!audioData || typeof audioData !== 'string') {
      console.error('[v0] Mistral TTS: empty/unknown response shape')
      return NextResponse.json({ error: 'Voice generation failed' }, { status: 502 })
    }

    const buffer = Buffer.from(audioData, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.byteLength.toString(),
        // Small CDN hint — previews are deterministic per (text, voice)
        // so we let the browser cache them briefly. The picker reloads
        // the same preview text each time a card is tapped, and this
        // trims the second tap down to ~0ms.
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('[v0] Voice API error:', error)
    return NextResponse.json({ error: 'Voice generation failed' }, { status: 500 })
  }
}
