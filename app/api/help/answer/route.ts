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

// Whether the question is about *where* we are / how to get to us. When true
// the Help Center renders the live interactive branch map right inside the
// answer card instead of just describing the addresses in words.
const LOCATION_KEYWORDS = [
  'location', 'locations', 'address', 'where', 'branch', 'branches',
  'directions', 'direction', 'map', 'navigate', 'find you', 'find us',
  'how to get', 'how do i get', 'parking', 'victoria island', 'ikoyi',
]
function wantsMap(question: string) {
  const q = question.toLowerCase()
  return LOCATION_KEYWORDS.some((k) => q.includes(k))
}

const SYSTEM_PROMPT = `You are the Dermaspace Help Center assistant for Dermaspace Esthetic and Wellness Centre, a skincare and wellness spa in Lagos, Nigeria with branches in Victoria Island and Ikoyi.

Answer the user's question clearly and warmly in 2-4 short sentences. Be specific and practical.

Linking — this is important. When the answer involves an action the user can take in the app, link the relevant words to the exact in-app page using markdown link syntax: [label](/path). Only use paths from this approved list — never invent URLs or features that don't exist:
- /booking — book or schedule an appointment
- /dashboard/wallet — wallet, funding, balance, top up
- /dashboard/transactions — transactions, receipts, refunds
- /dashboard/bookings — view, reschedule or cancel a booking
- /dashboard/settings — account, password, email, security
- /services — services, treatments and prices
- /membership — memberships and packages
- /locations — branches, addresses, hours, directions
- /dashboard/support — contact support / open a ticket
- /consultation — free skin consultation

For example: "You can update it in [Settings](/dashboard/settings)." or "Top up from [your Wallet](/dashboard/wallet)." Link the natural words, not the raw path. Use 1-2 links where they genuinely help the user navigate — do not link every sentence.

Rules:
- Never make up prices, policies, or features. If you are unsure, say they can [contact support](/dashboard/support).
- Keep it concise and friendly. The only markdown allowed is the [label](/path) links described above and **bold** for emphasis. No headings, bullet lists, or other markdown.
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
  const showMap = wantsMap(question)

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
          "I couldn't generate an answer right now. You can reach our team directly from [Contact support](/dashboard/support) and we'll be happy to help.",
        sources,
        showMap,
        provider: pick.name,
      })
    }

    return NextResponse.json({ answer, sources, showMap, provider: pick.name })
  } catch (error) {
    console.error('[v0] help/answer error:', error)
    return NextResponse.json(
      {
        answer:
          "Something went wrong generating an answer. Please try again, or reach our team from [Contact support](/dashboard/support).",
        sources,
        showMap,
      },
      { status: 200 },
    )
  }
}
