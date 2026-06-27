'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  MessageSquare,
  Wallet,
  Check,
  Flower2,
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
 *   Right column : a clean floating app-window mockup that rotates
 *                   through REAL screenshots of the actual Derma AI
 *                   assistant — its welcome screen, an in-chat
 *                   conversation with quick actions, and the live
 *                   voice picker — so visitors see the real concierge
 *                   they'll be talking to. Screenshots are captured
 *                   straight from the running chat and live in
 *                   /public/images/mockups.
 *
 *   When a user is signed in, the eyebrow / headline / capability
 *   copy / CTAs all personalize so the section feels like "your
 *   concierge" rather than a generic marketing pitch.
 * ------------------------------------------------------------------ */

/* -------------------- Real Derma AI screenshots -------------------
 * Each shot is a faithful screenshot of the actual Derma AI chat.
 * `label` is shown on the screen pills; the window chrome reads as a
 * real, secure session rather than an illustration.
 * ------------------------------------------------------------------ */
type Shot = {
  id: string
  label: string
  path: string
  src: string
  alt: string
}

const SHOTS: Shot[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    path: 'Derma AI · Concierge',
    src: '/images/mockups/derma-ai-welcome.png',
    alt: 'Derma AI welcome screen greeting the user with quick suggestions like popular services, skin advice and finding a branch',
  },
  {
    id: 'chat',
    label: 'Ask anything',
    path: 'Derma AI · Concierge',
    src: '/images/mockups/derma-ai-chat.png',
    alt: 'Derma AI chat showing the assistant greeting with quick action cards to book an appointment or browse services',
  },
  {
    id: 'live',
    label: 'Voice',
    path: 'Derma AI · Live',
    src: '/images/mockups/derma-ai-live.png',
    alt: 'Derma AI Live voice picker letting you choose a voice before starting a real-time voice chat',
  },
]

export default function AISection() {
  const { user, isAuthenticated } = useAuth()
  const firstName = isAuthenticated ? user?.firstName || null : null

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
      <div className="relative max-w-7xl mx-auto px-4">
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

          {/* ------------------- Right: app mockup + screen pills ---------------- */}
          <div className="order-1 lg:order-2 flex flex-col items-center gap-5 md:gap-6">
            <AppShowcase />
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------- App showcase -----------------------------
 *
 * A clean floating app-window that cross-fades between real product
 * screenshots. The window chrome (dots + locked URL pill) reads as a
 * genuine secure page; the screenshots themselves are the actual app.
 * Visitors can tap a pill to jump to a specific screen, and the view
 * auto-advances every few seconds so the full set is seen without
 * interaction.
 * ------------------------------------------------------------------ */
function AppShowcase() {
  const [idx, setIdx] = useState(0)

  // Auto-advance through the screenshots. Pauses are unnecessary — each
  // shot is a static image so there's nothing to "finish" before moving
  // on, unlike the old bubble-by-bubble chat reveal.
  useEffect(() => {
    if (SHOTS.length < 2) return
    const tick = setTimeout(() => {
      setIdx((i) => (i + 1) % SHOTS.length)
    }, 4200)
    return () => clearTimeout(tick)
  }, [idx])

  const active = SHOTS[idx]

  return (
    <div className="w-full flex flex-col items-center gap-5 md:gap-6">
      <div className="relative w-full max-w-[300px] sm:max-w-[360px] md:max-w-[400px] lg:max-w-[440px] mx-auto pb-6">
        {/* Ambient brand halo behind the window. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-6 bottom-10 rounded-[44px] bg-[#7B2D8E]/10 blur-3xl"
        />

        <div className="relative rounded-3xl bg-white border border-gray-200/80 overflow-hidden shadow-[0_12px_32px_-16px_rgba(17,24,39,0.15)]">
          {/* Browser-style chrome strip with a locked URL pill. */}
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-1 flex-shrink-0">
              <span aria-hidden="true" className="block w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/30" />
              <span aria-hidden="true" className="block w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/55" />
              <span aria-hidden="true" className="block w-2.5 h-2.5 rounded-full bg-[#7B2D8E]" />
            </div>
            <div className="flex-1 flex justify-center min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-md bg-white border border-gray-200 max-w-full min-w-0">
                <Lock className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                <span className="text-[9.5px] sm:text-[10px] font-medium text-gray-500 truncate">
                  {active.path}
                </span>
              </div>
            </div>
            <MoreHorizontal className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </div>

          {/* Screenshot stage — the container matches the real
              screenshot ratio (420 × 760) so nothing is cropped, and
              `object-contain` keeps each full screen visible. Images are
              stacked and toggled via opacity for a smooth transition. */}
          <div
            className="relative bg-white overflow-hidden"
            style={{ aspectRatio: '420 / 760' }}
          >
            {SHOTS.map((shot, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={shot.id}
                src={shot.src || '/placeholder.svg'}
                alt={shot.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${
                  i === idx ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Trust strip directly beneath the window. */}
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

      {/* Screen pills — tap to jump to a specific screenshot. */}
      <div
        className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 max-w-[320px]"
        role="tablist"
        aria-label="Product screens"
      >
        {SHOTS.map((s, i) => {
          const isActive = i === idx
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setIdx(i)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                isActive
                  ? 'bg-[#7B2D8E] text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
