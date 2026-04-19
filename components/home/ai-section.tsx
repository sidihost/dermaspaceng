'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  MessageSquare,
  Mic,
  Paperclip,
  Send,
  Wallet,
  Check,
  Flower2,
  Plus,
  TrendingUp,
  Search,
  MapPin,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'
import { useAuth } from '@/hooks/use-auth'

/* ------------------------------------------------------------------
 * Homepage "Derma AI" showcase section.
 *
 *   Left column  : copy + capability list + CTAs (matches services
 *                   / laser / booking sections in spacing, heading
 *                   scale, and rhythm).
 *   Right column : a proper phone-frame mockup that rotates through
 *                   several faithful mini-demos — booking, wallet,
 *                   product recommendations, and "cancel my visit"
 *                   — so visitors see that Derma AI actually runs
 *                   actions, not just chats. Each scene uses the
 *                   same header / composer / tool-card language as
 *                   the real /derma-ai chat.
 *
 *   When a user is signed in, the eyebrow / headline / example
 *   conversation / placeholder / CTAs all personalize so the section
 *   feels like "your concierge" rather than a generic marketing pitch.
 * ------------------------------------------------------------------ */

/* -------------------- Demo scenes ----------------------------------
 * Each scene is a tiny script: user prompt → thinking → assistant reply
 * → "tool card" payload. Cards mirror the real <ToolResultCard> output
 * from components/shared/derma-ai.tsx so what you see here is exactly
 * what you get in the app.
 * ------------------------------------------------------------------ */
type DemoStep =
  | { kind: 'user'; text: string }
  | { kind: 'thinking'; label: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'card'; variant: SceneVariant }

type SceneVariant = 'booking' | 'wallet' | 'products' | 'transactions'

type Scene = {
  id: string
  label: string
  icon: React.ReactNode
  steps: DemoStep[]
}

function buildScenes(firstName: string | null): Scene[] {
  const name = firstName ?? ''
  return [
    {
      id: 'booking',
      label: 'Book',
      icon: <Calendar className="w-3 h-3" />,
      steps: [
        {
          kind: 'user',
          text: firstName
            ? 'Book my usual facial for Saturday — any Ikoyi slot.'
            : 'Book a facial at Ikoyi this Saturday.',
        },
        { kind: 'thinking', label: 'Checking availability' },
        {
          kind: 'assistant',
          text: firstName
            ? `On it${name ? `, ${name}` : ''}. Three Saturday slots open — pick one and I\u2019ll book it.`
            : 'Three Saturday slots left at Ikoyi. Tap one and I\u2019ll book it.',
        },
        { kind: 'card', variant: 'booking' },
      ],
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: <Wallet className="w-3 h-3" />,
      steps: [
        {
          kind: 'user',
          text: firstName ? "What's my wallet balance?" : 'Show me my wallet balance.',
        },
        { kind: 'thinking', label: 'Fetching your balance' },
        {
          kind: 'assistant',
          text: firstName
            ? `Here\u2019s your wallet${name ? `, ${name}` : ''} — tap top-up any time.`
            : 'Your wallet — tap top-up to fund it in seconds.',
        },
        { kind: 'card', variant: 'wallet' },
      ],
    },
    {
      id: 'products',
      label: 'Products',
      icon: <Search className="w-3 h-3" />,
      steps: [
        {
          kind: 'user',
          text: 'Recommend a vitamin C serum for dark skin.',
        },
        { kind: 'thinking', label: 'Searching the web' },
        {
          kind: 'assistant',
          text: 'Here are three highly-rated options that work great on melanin-rich skin.',
        },
        { kind: 'card', variant: 'products' },
      ],
    },
    {
      id: 'transactions',
      label: 'History',
      icon: <TrendingUp className="w-3 h-3" />,
      steps: [
        {
          kind: 'user',
          text: 'What did I spend this month?',
        },
        { kind: 'thinking', label: 'Pulling transactions' },
        {
          kind: 'assistant',
          text: 'Two top-ups and a facial booking. Full breakdown below.',
        },
        { kind: 'card', variant: 'transactions' },
      ],
    },
  ]
}

export default function AISection() {
  const { user, isAuthenticated } = useAuth()
  const firstName = isAuthenticated ? user?.firstName || null : null

  const scenes = useMemo(() => buildScenes(firstName), [firstName])

  // Which scene (feature demo) is active.
  const [sceneIdx, setSceneIdx] = useState(0)
  // How many bubbles of the active scene are visible — stepped through
  // one at a time for a small "live" feel.
  const [visible, setVisible] = useState(1)

  // Reset when scene changes.
  useEffect(() => {
    setVisible(1)
  }, [sceneIdx])

  // Reveal one bubble at a time; when the scene finishes, hold briefly
  // then advance to the next scene for a polished rotating showcase.
  useEffect(() => {
    const total = scenes[sceneIdx].steps.length
    const tick = setTimeout(
      () => {
        if (visible < total) {
          setVisible((v) => v + 1)
        } else {
          setSceneIdx((idx) => (idx + 1) % scenes.length)
        }
      },
      // Pause longer on the final card so the user can actually read it.
      visible >= total ? 2600 : 1300,
    )
    return () => clearTimeout(tick)
  }, [visible, sceneIdx, scenes])

  const activeScene = scenes[sceneIdx]
  const shown = activeScene.steps.slice(0, visible)

  const capabilities = [
    {
      icon: <Calendar className="w-4 h-4" />,
      title: 'Books & reschedules for you',
      copy: firstName
        ? 'Just say when. Derma AI picks the right slot at the right branch and confirms.'
        : 'Any service, any branch — one message is all it takes.',
    },
    {
      icon: <Wallet className="w-4 h-4" />,
      title: 'Pays straight from your wallet',
      copy: 'Top up, check balance, or pay for a visit without leaving the chat.',
    },
    {
      icon: <Flower2 className="w-4 h-4" />,
      title: 'Picks real products for your skin',
      copy: 'Live product search with sources — no invented brands or prices.',
    },
    {
      icon: <MessageSquare className="w-4 h-4" />,
      title: 'Answers anything, 24/7',
      copy: 'Aftercare, directions, pricing, routines — always on, by text or voice.',
    },
  ]

  return (
    <section
      className="py-12 md:py-16 bg-white overflow-hidden"
      aria-labelledby="derma-ai-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4">
        <SectionHeader
          badge={firstName ? `Welcome back, ${firstName}` : 'Your personal concierge'}
          title={firstName ? 'Anything you need,' : 'One message.'}
          highlight={firstName ? 'handled' : 'Anything handled.'}
          description={
            firstName
              ? `Your Derma AI can book, reschedule, top up your wallet, recommend products, and answer anything — just tell it what you need, ${firstName}.`
              : 'Derma AI books visits, pays from your wallet, picks products, and answers anything about your care — all in a single chat, 24/7.'
          }
        />

        <div className="grid lg:grid-cols-2 gap-8 md:gap-10 lg:gap-14 items-center">
          {/* ------------------- Left: copy + bullets + CTA ---------------- */}
          <div className="order-2 lg:order-1">
            <h3 id="derma-ai-heading" className="sr-only">
              Meet Derma AI
            </h3>

            {/* Derma AI brand lock-up — a clean, flat icon badge that
                anchors the section. Butterfly logomark matches the
                one used in the chat header, launcher and page sidebar
                so the identity stays consistent everywhere the
                assistant appears. No drop shadow, no gradient halo,
                no sparkle — per brand direction, the mark speaks for
                itself. A small pulsing dot is the only "live" cue. */}
            <div className="mb-5 flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-2xl bg-[#7B2D8E] text-white flex items-center justify-center">
                <ButterflyLogo className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900 leading-tight">
                  Derma AI
                </p>
                <p className="text-[11px] text-gray-500 leading-none mt-1">
                  Your Dermaspace concierge
                </p>
              </div>
            </div>

            <ul className="space-y-4">
              {capabilities.map((cap) => (
                <li key={cap.title} className="flex gap-3">
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
                    {cap.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm md:text-base font-semibold text-gray-900 leading-tight">
                      {cap.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 leading-relaxed text-pretty">
                      {cap.copy}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />
                Voice or text
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />
                Replies in &lt; 2 sec
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />
                Works on every device
              </span>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/derma-ai"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-full font-semibold text-sm hover:bg-[#6B2278] transition-colors"
              >
                {firstName ? 'Open Derma AI' : 'Try Derma AI free'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href={firstName ? '/dashboard' : '/services'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-full font-semibold text-sm hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors"
              >
                {firstName ? 'Go to dashboard' : 'Browse services'}
              </Link>
            </div>
          </div>

          {/* ------------------- Right: phone mockup + feature pills ---------------- */}
          <div className="order-1 lg:order-2 flex flex-col items-center gap-5 md:gap-6">
            <PhoneMockup shown={shown} firstName={firstName} activeLabel={activeScene.label} />

            {/* Feature pills — tappable so users can jump straight to
                the demo they care about. The running scene glows with
                brand color; the rest stay quiet neutral chips. */}
            <div
              className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 max-w-[320px]"
              role="tablist"
              aria-label="Derma AI demos"
            >
              {scenes.map((s, i) => {
                const isActive = i === sceneIdx
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setSceneIdx(i)
                      setVisible(1)
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                      isActive
                        ? 'bg-[#7B2D8E] text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]'
                    }`}
                  >
                    {s.icon}
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------- Phone mockup --------------------------
 *
 * A device-framed render of the real Derma AI chat so visitors see
 * exactly what they'll open on their phone. Scales fluidly: 260px on
 * small screens, 300px on desktop — so the section never overflows or
 * looks oversized.
 * ---------------------------------------------------------------- */

function PhoneMockup({
  shown,
  firstName,
  activeLabel,
}: {
  shown: DemoStep[]
  firstName: string | null
  activeLabel: string
}) {
  return (
    // The wrapper is width-constrained against the viewport AND against
    // its own column so the device never overflows (previous fixed
    // widths clipped badly on ~320px phones and felt cramped on tablet).
    // On lg+ the phone gets a little more room to breathe so the demo
    // reads clearly alongside the capability list.
    <div className="relative w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[320px] mx-auto">
      {/* Device outer frame — flat, no brand glow, no drop shadow,
          per the no-gradient brand direction. Height is driven by the
          inner screen's aspect-ratio so the outer frame always wraps
          the bezel cleanly regardless of viewport width. */}
      <div className="relative w-full rounded-[44px] bg-gray-900 p-[10px]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[3px] rounded-[41px] ring-1 ring-white/5"
        />

        <div className="relative rounded-[36px] bg-white overflow-hidden aspect-[9/19.5]">
          <div
            aria-hidden="true"
            className="absolute top-2 left-1/2 -translate-x-1/2 h-6 w-24 rounded-full bg-gray-900 z-20"
          />

          <div className="relative z-10 flex items-center justify-between px-6 pt-3 pb-2 text-[10px] font-semibold text-gray-900">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded-sm bg-gray-900" />
              <span className="inline-block w-2 h-2 rounded-full border border-gray-900" />
              <span className="inline-block w-4 h-2 rounded-sm bg-gray-900" />
            </span>
          </div>

          <ChatScreen shown={shown} firstName={firstName} activeLabel={activeLabel} />
        </div>
      </div>

      {/* Side buttons for extra realism */}
      <span
        aria-hidden="true"
        className="absolute top-20 -left-[3px] w-[3px] h-10 rounded-l-md bg-gray-800"
      />
      <span
        aria-hidden="true"
        className="absolute top-36 -left-[3px] w-[3px] h-16 rounded-l-md bg-gray-800"
      />
      <span
        aria-hidden="true"
        className="absolute top-28 -right-[3px] w-[3px] h-20 rounded-r-md bg-gray-800"
      />
    </div>
  )
}

/* ----------------------- Chat screen inside phone ----------------------- */

function ChatScreen({
  shown,
  firstName,
  activeLabel,
}: {
  shown: DemoStep[]
  firstName: string | null
  activeLabel: string
}) {
  return (
    <div className="flex flex-col h-[calc(100%-26px)]">
      {/* Brand header — matches the real derma-ai.tsx header (flat
          brand colour, no gradient sheen). */}
      <div className="relative px-3.5 py-2.5 bg-[#7B2D8E] text-white">
        <div className="relative flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
            <ButterflyLogo className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold leading-none">Derma AI</p>
            <p className="text-[9px] text-white/70 leading-none mt-1 tracking-wide">
              {firstName ? `Ready for you, ${firstName}` : activeLabel + ' · live demo'}
            </p>
          </div>
          <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
            <Mic className="w-3 h-3 text-white" />
          </span>
        </div>
      </div>

      {/* Canvas — flat gray backdrop, same as the real chat. */}
      <div className="flex-1 overflow-hidden bg-gray-50 px-3 py-3">
        <div className="space-y-2.5">
          {shown.map((step, i) => (
            <StepBubble key={`${i}-${step.kind}`} step={step} />
          ))}
        </div>
      </div>

      {/* Composer — faithful static render. Uses min-w-0 + truncate on the
          input pill so the icons never get squeezed off-screen inside the
          smallest phone-mockup width (~260px) and the placeholder text
          always fits the available space. */}
      <div className="border-t border-gray-100 bg-white px-2 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-500"
            aria-label="Attach"
          >
            <Paperclip className="w-3 h-3" />
          </button>
          <div className="flex-1 min-w-0 h-7 rounded-full bg-gray-100 flex items-center px-2.5 text-[9.5px] text-gray-400">
            <span className="truncate">
              {firstName ? `Ask anything, ${firstName}…` : 'Ask Derma anything…'}
            </span>
          </div>
          <button
            type="button"
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[#7B2D8E]"
            aria-label="Voice"
          >
            <Mic className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center"
            aria-label="Send"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------------- Individual bubbles ---------------------- */

function StepBubble({ step }: { step: DemoStep }) {
  const base = 'animate-[derma-msg-in_0.45s_ease-out_both]'

  if (step.kind === 'user') {
    return (
      <div className={`${base} flex justify-end`}>
        <div className="max-w-[82%] bg-[#7B2D8E] text-white rounded-2xl rounded-br-md px-2.5 py-1.5 text-[10.5px] leading-snug">
          {step.text}
        </div>
      </div>
    )
  }

  if (step.kind === 'thinking') {
    return (
      <div className={`${base} flex items-end gap-1.5`}>
        <AvatarBubble />
        <div className="bg-white border border-gray-200/80 ring-1 ring-[#7B2D8E]/[0.04] rounded-2xl rounded-bl-md px-2.5 py-1.5 min-w-[140px]">
          <span className="block text-[9.5px] font-medium text-[#7B2D8E] leading-none">
            {step.label}…
          </span>
          <span
            aria-hidden="true"
            className="mt-1.5 block h-0.5 w-full rounded-full bg-[#7B2D8E]/10 overflow-hidden relative"
          >
            <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-[#7B2D8E]/70 rounded-full animate-[derma-shimmer_1.6s_ease-in-out_infinite]" />
          </span>
        </div>
      </div>
    )
  }

  if (step.kind === 'assistant') {
    return (
      <div className={`${base} flex items-end gap-1.5`}>
        <AvatarBubble />
        <div className="max-w-[82%] bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-200/80 ring-1 ring-[#7B2D8E]/[0.04] px-2.5 py-1.5 text-[10.5px] leading-snug">
          {step.text}
        </div>
      </div>
    )
  }

  // Tool-result card — switch on the variant so each scene gets a
  // different faithful preview (booking slots, wallet balance card,
  // product search, transaction history).
  return (
    <div className={`${base} flex items-end gap-1.5`}>
      <div className="w-5" aria-hidden="true" />
      <div className="flex-1 max-w-[94%]">
        {step.variant === 'booking' && <BookingCard />}
        {step.variant === 'wallet' && <WalletCard />}
        {step.variant === 'products' && <ProductsCard />}
        {step.variant === 'transactions' && <TransactionsCard />}
      </div>
    </div>
  )
}

function AvatarBubble() {
  return (
    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#7B2D8E] flex items-center justify-center">
      <ButterflyLogo className="w-2.5 h-2.5 text-white" />
    </div>
  )
}

/* ------------------------- Tool Cards (mini) ------------------------- */

function BookingCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-100">
        <div className="w-5 h-5 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
          <Calendar className="w-2.5 h-2.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-semibold text-gray-900 leading-none truncate">
            Deep Cleansing Facial
          </p>
          <p className="text-[8px] text-gray-500 leading-none mt-0.5 truncate inline-flex items-center gap-1">
            <MapPin className="w-2 h-2" /> Ikoyi · Sat 12 Apr
          </p>
        </div>
        <span className="text-[9px] font-semibold text-[#7B2D8E] tabular-nums whitespace-nowrap">
          ₦28,000
        </span>
      </div>
      <div className="px-2 py-1.5 grid grid-cols-3 gap-1">
        {['10:30', '12:00', '2:00'].map((t, i) => (
          <button
            key={t}
            type="button"
            className={`py-1 rounded-md text-[8.5px] font-semibold ${
              i === 2
                ? 'bg-[#7B2D8E] text-white'
                : 'bg-[#7B2D8E]/8 text-[#7B2D8E]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

function WalletCard() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#7B2D8E] text-white">
      <div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-xl" aria-hidden="true" />
      <div className="relative p-2.5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-white/15 ring-1 ring-white/20 flex items-center justify-center">
              <Wallet className="w-2.5 h-2.5" />
            </div>
            <div className="leading-none">
              <p className="text-[7px] font-semibold tracking-[0.14em] uppercase text-white/75">
                Available Balance
              </p>
              <p className="text-[7px] text-white/60 mt-0.5">Dermaspace Wallet</p>
            </div>
          </div>
          <span className="text-[7px] font-mono px-1.5 py-0.5 rounded-full bg-white/15 ring-1 ring-white/20">
            NGN
          </span>
        </div>
        <div className="flex items-baseline gap-0.5 mb-2">
          <span className="text-[10px] font-semibold text-white/80 leading-none">₦</span>
          <span className="text-[18px] font-bold tracking-tight tabular-nums leading-none">42,500</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-[#7B2D8E] text-[8px] font-semibold">
            <Plus className="w-2 h-2" strokeWidth={3} />
            Top up
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-white text-[8px] font-semibold ring-1 ring-white/20">
            <TrendingUp className="w-2 h-2" />
            History
          </span>
        </div>
      </div>
    </div>
  )
}

function ProductsCard() {
  const items = [
    { title: 'Vitamin C 20% Serum', source: 'cosrx.com' },
    { title: 'The Ordinary Ascorbyl', source: 'theordinary.com' },
    { title: 'La Roche-Posay Pure C', source: 'laroche-posay.us' },
  ]
  return (
    <div className="bg-white rounded-xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-100">
        <div className="w-5 h-5 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
          <Search className="w-2.5 h-2.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-semibold text-gray-900 leading-none">Recommended Products</p>
          <p className="text-[7.5px] text-gray-500 leading-none mt-0.5">From the web · 3 results</p>
        </div>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map((p, i) => (
          <li key={i} className="flex items-center gap-1.5 px-2 py-1.5">
            <div className="w-6 h-6 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
              <Flower2 className="w-2.5 h-2.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[8.5px] font-medium text-gray-900 leading-tight truncate">
                {p.title}
              </p>
              <p className="text-[7.5px] text-[#7B2D8E] uppercase tracking-wide truncate">
                {p.source}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TransactionsCard() {
  const rows = [
    { type: 'credit', label: 'Wallet top-up', amount: '+₦20,000', date: '4 Apr' },
    { type: 'debit', label: 'Facial · Ikoyi', amount: '−₦28,000', date: '2 Apr' },
    { type: 'credit', label: 'Wallet top-up', amount: '+₦50,000', date: '28 Mar' },
  ]
  return (
    <div className="bg-white rounded-xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-100">
        <div className="w-5 h-5 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
          <TrendingUp className="w-2.5 h-2.5" />
        </div>
        <p className="text-[9.5px] font-semibold text-gray-900 leading-none">Recent Transactions</p>
      </div>
      <ul className="divide-y divide-gray-100">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-1.5 px-2 py-1.5">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                r.type === 'credit'
                  ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {r.type === 'credit' ? (
                <ArrowDownLeft className="w-2.5 h-2.5" />
              ) : (
                <ArrowUpRight className="w-2.5 h-2.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-medium text-gray-900 leading-tight truncate">
                {r.label}
              </p>
              <p className="text-[7.5px] text-gray-400 leading-none mt-0.5">{r.date}</p>
            </div>
            <p
              className={`text-[9px] font-semibold tabular-nums ${
                r.type === 'credit' ? 'text-[#7B2D8E]' : 'text-gray-900'
              }`}
            >
              {r.amount}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
