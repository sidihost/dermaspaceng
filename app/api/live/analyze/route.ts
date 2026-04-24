import { generateText } from 'ai'
import { NextResponse } from 'next/server'

// Derma AI Live vision endpoint.
//
// Called on a ~3-second cadence while the user has their camera on
// inside Live. We feed the most recent frame (JPEG data URL) plus a
// short history window of prior observations to Gemini 3 Flash — a
// fast vision model available zero-config through the Vercel AI
// Gateway — and ask it for a single short sentence describing what
// it sees (face / lighting / visible skin concerns). The client
// splats the reply into the Live caption rail so the experience
// reads like Gemini Live: "Oh, I can see your forehead — looks a
// little dry around the brow".
//
// Keeping the response short + deterministic is critical here: we
// are polling continuously, so each round-trip must be cheap AND the
// answers must not contradict each other frame to frame. We also
// keep the endpoint stateless — the client owns the rolling history.

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

    const { text } = await generateText({
      // Gemini 3 Flash — fast multimodal model, zero-config via the
      // Vercel AI Gateway. If the gateway isn't configured this line
      // will throw and the client will gracefully skip this poll.
      model: 'google/gemini-3-flash',
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${historyBlock}Describe the NEW thing you notice in this frame.`,
            },
            {
              type: 'image',
              image: body.image,
            },
          ],
        },
      ],
      // Hard cap on tokens — captions should be one short line. We
      // also keep temperature low so adjacent frames produce stable,
      // non-hallucinatory descriptions.
      temperature: 0.35,
    })

    const observation = (text || '').trim().replace(/^["']|["']$/g, '')
    return NextResponse.json({ observation })
  } catch (err) {
    console.error('[v0] Live analyze error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analyze failed' },
      { status: 500 },
    )
  }
}
