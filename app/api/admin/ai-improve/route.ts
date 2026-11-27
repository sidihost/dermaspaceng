import { NextRequest, NextResponse } from 'next/server'
import { generateText, type LanguageModel } from 'ai'
import { requireAdminOrStaff } from '@/lib/auth'
import { getChatModelChain } from '@/lib/ai-chain'

/**
 * POST /api/admin/ai-improve
 *
 * Single-turn text rewriter that powers the "Improve with AI" button on
 * every admin reply composer (complaints, consultations, gift cards,
 * tickets). It does NOT stream — admins want a clean rewritten string
 * dropped into their textarea, not a typing animation. We re-use the
 * same provider chain as Derma AI so a single env var (Mistral, Groq,
 * Fireworks, Cloudflare, Vercel AI Gateway) keeps everything working.
 *
 * The request body has three knobs:
 *   • text     — the draft the admin typed
 *   • mode     — what to do with it (polish, shorten, expand, friendly,
 *                formal, apologise, translate-to-plain). Default 'polish'.
 *   • context  — optional one-line note about the conversation
 *                (e.g. "Replying to a gift-card refund request") so
 *                the model keeps the rewrite on-topic.
 *
 * The response is `{ improved: string, provider: string }`. On error
 * we surface a friendly message and a 503 so the UI can stash the
 * original draft back into the textarea.
 */

export const maxDuration = 20

type Mode =
  | 'draft'
  | 'polish'
  | 'shorten'
  | 'expand'
  | 'friendly'
  | 'formal'
  | 'apologise'
  | 'plain'

const SYSTEM_PROMPT = `You are an editing and writing assistant for the Dermaspace
customer-support and admin team. Write or rewrite the admin's message so it reads
warmly, professionally, and on-brand. Always:

  • Keep the original meaning when rewriting. Do not invent facts, dates, prices,
    bookings, refunds or staff names. If a detail isn't in the
    draft or context, leave it out.
  • Use UK English with a soft, hospitable Nigerian-luxury-spa tone
    (clear, calm, no jargon). Address the recipient directly.
  • Be brief. One short paragraph (2–3 sentences) by default. Use line breaks
    instead of bullet points unless the draft was already a list.
  • Sign-offs ("Best", "Warmly") are fine when appropriate, but skip the
    salutation ("Hi <name>,") — the system email templates already add that.
  • Output ONLY the message text. No prefaces ("Sure!"),
    no quotes around the text, no markdown headers. Plain text only.`

const MODE_PROMPTS: Record<Mode, string> = {
  draft:
    'Write a concise, warm, professional 2–3 sentence message tailored to the context below. If rough notes are provided, turn them into a clear finished message without inventing details.',
  polish:
    'Polish the draft below. Fix grammar and clarity, keep the meaning, keep it the same length.',
  shorten:
    'Make the draft below shorter and sharper without losing the key information. Aim for 2–3 sentences.',
  expand:
    'Expand the draft below into a slightly longer, warmer reply that acknowledges the customer and offers next steps.',
  friendly:
    'Rewrite the draft below in a warmer, more conversational tone. Use contractions. Stay on-brand.',
  formal:
    'Rewrite the draft below in a more formal tone. No contractions. No slang. Polite and professional.',
  apologise:
    'Rewrite the draft below so it leads with a sincere apology, then explains what we are doing about it. Avoid over-promising.',
  plain:
    'Rewrite the draft below in clear, plain English. Strip jargon. Short sentences. Easy for anyone to understand.',
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminOrStaff()

    const body = (await request.json().catch(() => null)) as
      | { text?: string; mode?: Mode; context?: string }
      | null

    const text = (body?.text ?? '').trim()
    const mode: Mode = (body?.mode ?? 'polish') as Mode
    const context = (body?.context ?? '').trim().slice(0, 320)

    if (!MODE_PROMPTS[mode]) {
      return NextResponse.json({ error: 'Unknown mode' }, { status: 400 })
    }
    if (mode === 'draft') {
      if (!text && !context) {
        return NextResponse.json(
          { error: 'Add a brief note or context so Derma AI knows what to write.' },
          { status: 400 },
        )
      }
    } else if (!text) {
      return NextResponse.json(
        { error: 'Empty draft — type something first.' },
        { status: 400 },
      )
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { error: 'Draft too long — keep it under 4000 characters.' },
        { status: 400 },
      )
    }

    const userPrompt = [
      MODE_PROMPTS[mode],
      context ? `\nContext: ${context}` : '',
      text ? `\nDraft:\n${text}` : '',
    ].join('')

    // Walk the provider chain. First success wins; the AI Gateway is
    // always the final fallback inside getChatModelChain().
    const chain = getChatModelChain()
    const errors: string[] = []
    for (const pick of chain) {
      try {
        const { text: out } = await generateText({
          model: pick.model as LanguageModel,
          system: SYSTEM_PROMPT,
          prompt: userPrompt,
          temperature: 0.4,
        })
        const cleaned = (out || '').trim().replace(/^["']+|["']+$/g, '')
        if (cleaned) {
          return NextResponse.json({ improved: cleaned, provider: pick.name })
        }
        errors.push(`${pick.name}: empty`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${pick.name}: ${msg.slice(0, 120)}`)
        // try next provider
      }
    }

    console.error('AI improve failed across all providers:', errors.join(' | '))
    return NextResponse.json(
      { error: 'AI is busy right now. Please try again in a few seconds.' },
      { status: 503 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const lower = message.toLowerCase()
    if (lower.includes('forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (lower.includes('unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('AI improve error:', error)
    return NextResponse.json(
      { error: 'Failed to improve text' },
      { status: 500 },
    )
  }
}
