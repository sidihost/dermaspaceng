import { NextResponse } from 'next/server'
import { analyzeVisionFrame } from '@/lib/ai-chain'

// Derma AI Live vision endpoint.
//
// Called on a ~3-second cadence while the user has their camera on
// inside Live. We feed the most recent frame (JPEG data URL) plus a
// short history window of prior observations to our vision chain —
// Mistral Pixtral → Fireworks Llama-Vision → Cloudflare Llama-Vision
// → Vercel AI Gateway Gemini — and use whichever responds first.
//
// Keeping the response short + deterministic is critical: we're
// polling continuously, so each round-trip must be cheap AND the
// answers must not contradict each other frame to frame. We keep the
// endpoint stateless — the client owns the rolling history.

export const maxDuration = 20

const SYSTEM = `You are Derma AI Live — the real-time vision layer behind Dermaspace's in-app skin concierge.
You receive a single camera frame plus the last few observations you already made.
Your job is to produce ONE short sentence (max ~18 words) describing what you now see, as if you were talking to the user in real time.
Focus on:
- Whether you can see a face, how well-lit it is, and which skin zones are visible.
- Any visible skin cues worth noting (tone, texture, redness, dryness, oily sheen, breakouts, dark circles).
- Positioning coaching when helpful ("move a little closer", "try better lighting").
Rules:
- Never repeat the previous observation verbatim — describe the NEW thing you notice.
- Never diagnose medical conditions. Use soft language: "looks a little dry", "I'm seeing some redness around the cheeks".
- Never invent detail you can't see. If the frame is dark / blurry, say so.
- Do not use markdown, lists, or quotes. Plain conversational text only.
- Do not greet. Do not say "I see an image of". Jump straight to the observation.`

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      image?: string
      history?: string[]
    }
    if (!body?.image || !body.image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Missing image frame' }, { status: 400 })
    }

    // Trim history to the last 3 observations so the prompt stays
    // small and the model doesn't get anchored on stale detail.
    const recent = (body.history ?? []).slice(-3)
    const historyBlock = recent.length
      ? `Your last observations (most recent last):\n${recent.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`
      : ''

    try {
      const { text, provider } = await analyzeVisionFrame({
        image: body.image,
        system: SYSTEM,
        prompt: `${historyBlock}Describe the NEW thing you notice in this frame.`,
        temperature: 0.35,
        // Each provider gets a 7s budget; with 4 providers that's a
        // worst-case 28s, which fits under our 20s maxDuration since
        // we bail out at the first success.
        timeoutMs: 7000,
      })
      return NextResponse.json({ observation: text, provider })
    } catch (err) {
      // If ALL vision providers failed (no keys set + gateway also
      // down) we return an empty observation rather than a 500 so
      // the client-side poll loop doesn't log a noisy error on every
      // tick. The UI keeps showing the previous caption.
      console.warn('[v0] Live analyze: no provider could serve:', err)
      return NextResponse.json({ observation: '', provider: null }, { status: 200 })
    }
  } catch (err) {
    console.error('[v0] Live analyze fatal:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analyze failed' },
      { status: 500 },
    )
  }
}
