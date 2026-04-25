import { NextResponse } from 'next/server'

/**
 * POST /api/voice/transcribe
 *
 * Speech-to-text endpoint backed by Mistral's Voxtral audio model
 * (`voxtral-mini-2507`). Replaces the previous reliance on the
 * browser's webkitSpeechRecognition API, which silently failed on
 * iOS Safari, every Firefox, and any non-Chromium browser — leaving
 * the chat composer's mic button (and Live mode's listen leg) dead
 * for a huge chunk of users.
 *
 * Request body: a multipart form with a single `file` field holding
 * the recorded audio blob (we record `audio/webm;codecs=opus` on the
 * client by default). Mistral accepts webm/opus, mp3, wav and m4a.
 *
 * Response: `{ text: string }` on success, `{ error: string }` on
 * failure with an appropriate HTTP status.
 *
 * Notes:
 *   • Endpoint is intentionally model/provider-flexible. If
 *     `MISTRAL_API_KEY` is unset we return a 503 so the client can
 *     surface a clean "voice input unavailable" hint instead of a
 *     cryptic 500.
 *   • We use `multipart/form-data` because Mistral's
 *     `/v1/audio/transcriptions` mirrors the OpenAI Whisper schema,
 *     including the `file` field plus a textual `model` field — no
 *     custom JSON shape required.
 */

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request) {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Voice input is not configured. Set MISTRAL_API_KEY to enable transcription.' },
      { status: 503 },
    )
  }

  let inbound: FormData
  try {
    inbound = await req.formData()
  } catch (err) {
    console.warn('[v0] Voice transcribe: bad form data', err)
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const file = inbound.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Recording was empty.' }, { status: 400 })
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Recording too long (max 25 MB).' }, { status: 413 })
  }

  // Re-pack the file under the field name Mistral expects. We also
  // pin the model + language. Mistral autodetects language well, but
  // forcing `en` keeps the chat composer behaviour consistent with
  // the rest of the site (everything else is en-NG).
  const upstream = new FormData()
  upstream.append('file', file, file.name || 'audio.webm')
  upstream.append('model', 'voxtral-mini-2507')

  try {
    const res = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.warn('[v0] Voice transcribe: Mistral error', res.status, detail.slice(0, 240))
      return NextResponse.json(
        { error: 'Transcription failed. Try again.' },
        { status: 502 },
      )
    }

    const data = (await res.json()) as { text?: string }
    const text = (data.text ?? '').trim()
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[v0] Voice transcribe fatal:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transcription failed' },
      { status: 500 },
    )
  }
}
