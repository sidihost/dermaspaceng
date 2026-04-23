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
  // Glyphs for the premium floating-app mockup chrome: Lock for the
  // "secured" URL pill, Shield for the trust badge, Sparkles for the
  // subtle "Live" indicator, and ShieldCheck for the footer chips.
  Lock,
  ShieldCheck,
  MoreHorizontal,
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

  // Which scene (feature demo) is active. Each scene renders the FULL
  // conversation at once with a tight staggered fade-in (controlled in
  // StepBubble via CSS custom properties) — the way Vercel / Google /
  // Linear would present a product demo. The previous 1.3s-per-bubble
  // reveal felt like a tutorial, not a demo.
  const [sceneIdx, setSceneIdx] = useState(0)

  // Auto-advance to the next scene every ~5s so visitors see the full
  // breadth of what the assistant can do (booking → wallet → products
  // → transactions) without having to interact. A single timer is all
  // we need now that scenes aren't stepped through bubble by bubble.
  useEffect(() => {
    const tick = setTimeout(() => {
      setSceneIdx((idx) => (idx + 1) % scenes.length)
    }, 5200)
    return () => clearTimeout(tick)
  }, [sceneIdx, scenes])

  const activeScene = scenes[sceneIdx]
  const shown = activeScene.steps

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
          badge={firstName ? `Welcome back, ${firstName}` : 'Derma AI'}
          title={firstName ? 'Just tell it,' : 'Ask. It'}
          highlight={firstName ? 'it\u2019s done' : 'handles it.'}
          description={
            firstName
              ? `Book, reschedule, top up your wallet, or get a product sorted. Ping it like you would a friend at the front desk, ${firstName}.`
              : 'It books visits, pays from your wallet, picks products, and answers the questions you\u2019d rather not call to ask. One chat, round the clock.'
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
              {/* Opens the floating Derma AI chat (mounted globally via
                  components/shared/derma-ai-mount.tsx) by dispatching
                  the `openDermaAI` window event it already listens
                  for. No dedicated page — the chat lives everywhere. */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('openDermaAI'))
                  }
                }}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-full font-semibold text-sm hover:bg-[#6B2278] transition-colors"
              >
                {firstName ? 'Open Derma AI' : 'Try Derma AI free'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <Link
                href={firstName ? '/dashboard' : '/services'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-full font-semibold text-sm hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors"
              >
                {firstName ? 'Go to dashboard' : 'Browse services'}
              </Link>
            </div>
          </div>

          {/* ------------------- Right: app mockup + feature pills ---------------- */}
          <div className="order-1 lg:order-2 flex flex-col items-center gap-5 md:gap-6">
            <ChatAppMockup shown={shown} firstName={firstName} activeLabel={activeScene.label} />

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

/* -------------------------- Chat app mockup --------------------------
 *
 * A clean, modern "floating app window" rendering of the real Derma AI
 * chat — the kind of product mockup you'd expect to see on a Vercel /
 * Linear / Google product page. No physical phone bezel, no fake "9:41"
 * clock, no clutter. Just:
 *
 *   • a soft brand-tinted halo behind the window (solid-colour blur,
 *     not a gradient — per brand direction)
 *   • a pill-shaped "Live · demo" badge hovering above the window
 *   • a restrained macOS-style chrome strip with a locked-URL pill so
 *     visitors read the card as a real secure app
 *   • the branded Derma AI header with an online dot
 *   • the actual chat content (bubbles + tool cards)
 *   • a polished composer footer
 *   • a small "trusted by" chip row directly beneath the card
 *
 * The whole thing scales fluidly from 340px on phones up to 480px on
 * wide desktops so the section never looks undersized on a 1440px
 * display the way the old phone-bezel mockup did.
 * ---------------------------------------------------------------- */

function ChatAppMockup({
  shown,
  firstName,
  activeLabel,
}: {
  shown: DemoStep[]
  firstName: string | null
  activeLabel: string
}) {
  // Width scales cleanly across every breakpoint: fits inside a
  // 320px phone viewport, stays comfortable at tablet size, and gets
  // a little more room on desktop without dominating the column. The
  // `w-full` + `max-w-*` pattern means the window always shrinks to
  // fit its parent, never overflows horizontally.
  return (
    <div className="relative w-full max-w-[300px] sm:max-w-[360px] md:max-w-[400px] lg:max-w-[440px] mx-auto pb-6">
      {/* Ambient brand halo — a single soft brand-purple blur anchors
          the window without resorting to a gradient. Negative z so it
          stays behind everything. Toned-down opacity so it's a hint of
          colour, not a glow. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-6 bottom-10 rounded-[44px] bg-[#7B2D8E]/10 blur-3xl"
      />

      {/* The app window itself. Single soft grounding shadow — the
          previous layered brand-tinted shadow read as a heavy purple
          halo under the window, which made the mockup feel dropped onto
          the page instead of sitting on it. This is quieter and lets
          the content breathe. */}
      <div className="relative rounded-3xl bg-white border border-gray-200/80 overflow-hidden shadow-[0_12px_32px_-16px_rgba(17,24,39,0.15)]">
        {/* Browser-style chrome strip — three small window dots at
            descending brand-purple opacities instead of the macOS
            red/amber/green, plus a locked URL pill centred in the bar.
            Still reads as "real app window" but stays 100% on-brand. */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              aria-hidden="true"
              className="block w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/30"
            />
            <span
              aria-hidden="true"
              className="block w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/55"
            />
            <span
              aria-hidden="true"
              className="block w-2.5 h-2.5 rounded-full bg-[#7B2D8E]"
            />
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-md bg-white border border-gray-200 max-w-full min-w-0">
              <Lock className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
              <span className="text-[9.5px] sm:text-[10px] font-medium text-gray-500 truncate">
                dermaspaceng.com
              </span>
            </div>
          </div>
          <MoreHorizontal className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        </div>

        <ChatScreen shown={shown} firstName={firstName} activeLabel={activeLabel} />
      </div>

      {/* Trust strip directly beneath the window — mirrors the badges
          the real app shows in its "About" panel. Keeps the section
          feeling like one connected story. */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10.5px] text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-[#7B2D8E]" />
          Private to your account
        </span>
        <span className="text-gray-300" aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1.5">
          <Check className="w-3 h-3 text-[#7B2D8E]" strokeWidth={2.5} />
          Replies in under 2s
        </span>
      </div>
    </div>
  )
}

/* ----------------------- Chat screen inside window -----------------------
 *
 * The actual chat surface. Rendered without the phone status bar and
 * uses a fixed aspect ratio so the section always reserves the same
 * vertical slot regardless of which scene is on screen (prevents the
 * section from jumping as bubbles reveal one at a time).
 * --------------------------------------------------------------------- */

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
    <div className="flex flex-col aspect-[5/7] sm:aspect-[4/5]">
      {/* Brand header — flat, single colour. No "online" pulse or
          status badge (the user found them distracting); just a clean
          avatar + title + contextual subtitle. */}
      <div className="relative px-3.5 py-2.5 bg-[#7B2D8E] text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/15 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
            <ButterflyLogo className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold leading-none tracking-tight">
              Derma AI
            </p>
            <p className="text-[10px] text-white/80 leading-none mt-1.5 truncate">
              {firstName
                ? `Ready when you are, ${firstName}`
                : `${activeLabel} · live preview`}
            </p>
          </div>
        </div>
      </div>

      {/* Canvas — flat gray backdrop, same as the real chat. */}
      <div className="flex-1 overflow-hidden bg-gray-50/80 px-3.5 py-3.5">
        <div className="space-y-3">
          {shown.map((step, i) => (
            <StepBubble key={`${i}-${step.kind}`} step={step} />
          ))}
        </div>
      </div>

      {/* Composer — faithful static render of the real one. */}
      <div className="border-t border-gray-100 bg-white px-2.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-500"
            aria-label="Attach"
            tabIndex={-1}
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 min-w-0 h-8 rounded-full bg-gray-100 flex items-center px-3 text-[11px] text-gray-400">
            <span className="truncate">
              {firstName ? `Ask anything, ${firstName}…` : 'Ask Derma anything…'}
            </span>
          </div>
          <button
            type="button"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[#7B2D8E]"
            aria-label="Voice"
            tabIndex={-1}
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center"
            aria-label="Send"
            tabIndex={-1}
          >
            <Send className="w-3.5 h-3.5" />
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
        <div className="max-w-[82%] bg-[#7B2D8E] text-white rounded-2xl rounded-br-md px-3 py-2 text-[11.5px] leading-snug">
          {step.text}
        </div>
      </div>
    )
  }

  if (step.kind === 'thinking') {
    return (
      <div className={`${base} flex items-end gap-2`}>
        <AvatarBubble />
        <div className="bg-white border border-gray-200/80 ring-1 ring-[#7B2D8E]/[0.04] rounded-2xl rounded-bl-md px-3 py-2 min-w-[160px]">
          <span className="block text-[11px] font-medium text-[#7B2D8E] leading-none">
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
      <div className={`${base} flex items-end gap-2`}>
        <AvatarBubble />
        <div className="max-w-[82%] bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-200/80 ring-1 ring-[#7B2D8E]/[0.04] px-3 py-2 text-[11.5px] leading-snug">
          {step.text}
        </div>
      </div>
    )
  }

  // Tool-result card — switch on the variant so each scene gets a
  // different faithful preview (booking slots, wallet balance card,
  // product search, transaction history).
  return (
    <div className={`${base} flex items-end gap-2`}>
      <div className="w-6" aria-hidden="true" />
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
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7B2D8E] flex items-center justify-center">
      <ButterflyLogo className="w-3 h-3 text-white" />
    </div>
  )
}

/* ------------------------- Tool Cards (mini) ------------------------- */

function BookingCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-100">
        <div className="w-6 h-6 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
          <Calendar className="w-3 h-3" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-gray-900 leading-none truncate">
            Deep Cleansing Facial
          </p>
          <p className="text-[9.5px] text-gray-500 leading-none mt-1 truncate inline-flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" /> Ikoyi · Sat 12 Apr
          </p>
        </div>
        <span className="text-[10.5px] font-semibold text-[#7B2D8E] tabular-nums whitespace-nowrap">
          ₦28,000
        </span>
      </div>
      <div className="px-2.5 py-2 grid grid-cols-3 gap-1.5">
        {['10:30', '12:00', '2:00'].map((t, i) => (
          <button
            key={t}
            type="button"
            className={`py-1.5 rounded-md text-[10px] font-semibold ${
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
      <div className="relative p-3">
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/15 ring-1 ring-white/20 flex items-center justify-center">
              <Wallet className="w-3 h-3" />
            </div>
            <div className="leading-none">
              <p className="text-[9px] font-semibold tracking-[0.14em] uppercase text-white/75">
                Available Balance
              </p>
              <p className="text-[9px] text-white/60 mt-1">Dermaspace Wallet</p>
            </div>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/15 ring-1 ring-white/20">
            NGN
          </span>
        </div>
        <div className="flex items-baseline gap-0.5 mb-2.5">
          <span className="text-[12px] font-semibold text-white/80 leading-none">₦</span>
          <span className="text-[22px] font-bold tracking-tight tabular-nums leading-none">42,500</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[#7B2D8E] text-[10px] font-semibold">
            <Plus className="w-2.5 h-2.5" strokeWidth={3} />
            Top up
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white text-[10px] font-semibold ring-1 ring-white/20">
            <TrendingUp className="w-2.5 h-2.5" />
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
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-100">
        <div className="w-6 h-6 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
          <Search className="w-3 h-3" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-gray-900 leading-none">Recommended Products</p>
          <p className="text-[9px] text-gray-500 leading-none mt-1">From the web · 3 results</p>
        </div>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map((p, i) => (
          <li key={i} className="flex items-center gap-2 px-2.5 py-2">
            <div className="w-7 h-7 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
              <Flower2 className="w-3 h-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-gray-900 leading-tight truncate">
                {p.title}
              </p>
              <p className="text-[9px] text-[#7B2D8E] uppercase tracking-wide truncate">
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
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-100">
        <div className="w-6 h-6 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
          <TrendingUp className="w-3 h-3" />
        </div>
        <p className="text-[11px] font-semibold text-gray-900 leading-none">Recent Transactions</p>
      </div>
      <ul className="divide-y divide-gray-100">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-2 px-2.5 py-2">
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                r.type === 'credit'
                  ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {r.type === 'credit' ? (
                <ArrowDownLeft className="w-3 h-3" />
              ) : (
                <ArrowUpRight className="w-3 h-3" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-medium text-gray-900 leading-tight truncate">
                {r.label}
              </p>
              <p className="text-[9px] text-gray-400 leading-none mt-1">{r.date}</p>
            </div>
            <p
              className={`text-[10.5px] font-semibold tabular-nums ${
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
