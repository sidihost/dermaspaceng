import { NextResponse } from 'next/server'
import { generateText, type LanguageModel } from 'ai'
import { getChatModelChain, pickFirstHealthyChatProvider } from '@/lib/ai-chain'

export const maxDuration = 30

// Lightweight, NON-streaming "AI Answer" endpoint for the Help Center.
// It reuses the same resilient multi-provider chain as /api/chat
// (Mistral → Groq → Fireworks → Cloudflare → Vercel Gateway) but with
// NO tools — the Help Center is informational only, so we just want a
// concise, grounded answer plus a short list of suggested follow-ups.
//
// Unlike the conversational assistant, this is a single request/response
// so the UI can render an answer card, thumbs up/down, and "Sources"
// (the in-app pages most relevant to the question).

// Curated knowledge base of canonical Dermaspace help topics. Each entry
// pairs a human title with the in-app route, so we can both ground the
// model AND surface real "Sources" links the user can tap.
const HELP_SOURCES: { title: string; path: string; keywords: string[] }[] = [
  { title: 'Book an appointment', path: '/booking', keywords: ['book', 'appointment', 'schedule', 'reserve', 'slot'] },
  { title: 'Your wallet & funding', path: '/dashboard/wallet', keywords: ['wallet', 'fund', 'balance', 'top up', 'topup', 'pay', 'payment', 'money'] },
  { title: 'Transactions & receipts', path: '/dashboard/transactions', keywords: ['transaction', 'receipt', 'history', 'refund', 'invoice'] },
  { title: 'Manage your bookings', path: '/dashboard/bookings', keywords: ['reschedule', 'cancel', 'booking', 'change appointment'] },
  { title: 'Account settings & password', path: '/dashboard/settings', keywords: ['password', 'reset', 'email', 'phone', 'account', 'profile', 'login', 'sign in', 'security'] },
  { title: 'Our services', path: '/services', keywords: ['service', 'treatment', 'facial', 'massage', 'wax', 'nail', 'price'] },
  { title: 'Memberships & packages', path: '/membership', keywords: ['membership', 'package', 'subscribe', 'plan', 'deal'] },
  { title: 'Locations & hours', path: '/locations', keywords: ['location', 'address', 'hours', 'where', 'branch', 'directions'] },
  { title: 'Contact support', path: '/dashboard/support', keywords: ['support', 'help', 'ticket', 'contact', 'complain', 'issue'] },
  { title: 'Free skin consultation', path: '/consultation', keywords: ['consultation', 'consult', 'skin advice', 'recommend'] },
]

function matchSources(question: string) {
  const q = question.toLowerCase()
  const scored = HELP_SOURCES.map((s) => ({
    ...s,
    score: s.keywords.reduce((acc, k) => (q.includes(k) ? acc + 1 : acc), 0),
  }))
  const hits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
  // Always return at least the two most universally useful entries so
  // the "Sources" section is never empty.
  const fallback = [HELP_SOURCES[8], HELP_SOURCES[0]]
  const chosen = (hits.length ? hits : fallback).slice(0, 3)
  return chosen.map(({ title, path }) => ({ title, path }))
}

const SYSTEM_PROMPT = `You are the Dermaspace Help Center assistant for Dermaspace Esthetic and Wellness Centre, a skincare and wellness spa in Lagos, Nigeria with branches in Victoria Island and Ikoyi.

Answer the user's question clearly and warmly in 2-4 short sentences. Be specific and practical. If the answer involves an action in the app (booking, funding a wallet, resetting a password, rescheduling), tell them exactly where to go using plain words like "Settings" or "your Wallet" — do NOT invent URLs or features that don't exist.

Rules:
- Never make up prices, policies, or features. If you are unsure, say they can contact support.
- Keep it concise and friendly. No markdown headings, no bullet lists unless truly necessary.
- Do not mention that you are an AI model or which provider you run on.`

export async function POST(req: Request) {
  let question = ''
  try {
    const body = await req.json()
    question = String(body?.question ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!question) {
    return NextResponse.json({ error: 'Please enter a question.' }, { status: 400 })
  }
  if (question.length > 90) {
    question = question.slice(0, 90)
  }

  const sources = matchSources(question)

  try {
    const chain = getChatModelChain()
    const { pick } = await pickFirstHealthyChatProvider(chain)

    const { text } = await generateText({
      model: pick.model as LanguageModel,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: question }],
      maxOutputTokens: 320,
      temperature: 0.4,
    })

    const answer = (text || '').trim()
    if (!answer) {
      return NextResponse.json({
        answer:
          "I couldn't generate an answer right now. You can reach our team directly from the Contact support page and we'll be happy to help.",
        sources,
        provider: pick.name,
      })
    }

    return NextResponse.json({ answer, sources, provider: pick.name })
  } catch (error) {
    console.error('[v0] help/answer error:', error)
    return NextResponse.json(
      {
        answer:
          "Something went wrong generating an answer. Please try again, or reach our team from the Contact support page.",
        sources,
      },
      { status: 200 },
    )
  }
}
