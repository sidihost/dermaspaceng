'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import { useAuth } from '@/hooks/use-auth'

/* ------------------------------------------------------------------
 * Homepage "Derma AI" showcase section.
 *
 *   Left column  : copy + capability list + CTAs (matches services
 *                   / laser / booking sections in spacing, heading
 *                   scale, and rhythm).
 *   Right column : a proper phone-frame mockup that mirrors the real
 *                   Derma AI chat — same brand header, same shimmer
 *                   thinking indicator, same booking-slots card. No
 *                   "remembers N" label anywhere — memory is built-in
 *                   to the product, never advertised in the UI.
 *
 *   When a user is signed in, the eyebrow / headline / example
 *   conversation / placeholder / CTAs all personalize so the section
 *   feels like "your concierge" rather than a generic marketing pitch.
 * ------------------------------------------------------------------ */

function ButterflyLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M16 4c-3.3 0-6 2.7-6 6 0 2 1 3.7 2.4 4.9-.8.4-1.7 1.1-2.4 1.7-2-1.6-4.7-2.6-7.3-2.6-.8 0-1.3.5-1.3 1.3s.5 1.3 1.3 1.3c1.9 0 3.6.7 5.1 1.7C6 20 5.3 22.3 5.3 24.7c0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-1.9.5-3.6 1.5-5.1.7.4 1.5.8 2.3 1.1-.7 1.5-1.1 3.2-1.1 4.9 0 3.3 2.7 5.7 5.3 5.7s5.3-2.4 5.3-5.7c0-1.7-.4-3.5-1.1-4.9.8-.3 1.6-.7 2.3-1.1 1 1.5 1.5 3.2 1.5 5.1 0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-2.4-.7-4.7-2.4-6.3 1.5-1 3.2-1.7 5.1-1.7.8 0 1.3-.5 1.3-1.3s-.5-1.3-1.3-1.3c-2.7 0-5.3 1.1-7.3 2.6-.7-.7-1.6-1.3-2.4-1.7C21 13.7 22 12 22 10c0-3.3-2.7-6-6-6zm0 2.7c1.9 0 3.3 1.5 3.3 3.3S17.9 13.3 16 13.3s-3.3-1.5-3.3-3.3S14.1 6.7 16 6.7z" />
    </svg>
  )
}

/* -------------------- Animated conversation demo ------------------- */
type DemoStep =
  | { kind: 'user'; text: string }
  | { kind: 'thinking'; label: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'card' }

function buildScript(firstName: string | null): DemoStep[] {
  const opener = firstName
    ? 'Book my usual facial for Saturday — whichever Ikoyi slot works.'
    : 'Book a facial at Ikoyi this Saturday and pay from my wallet.'

  const reply = firstName
    ? `On it, ${firstName}. Three Saturday slots open — pick one and I\u2019ll book + pay from your wallet.`
    : 'Three Saturday slots left at Ikoyi. Tap one and I\u2019ll book it + handle payment.'

  return [
    { kind: 'user', text: opener },
    { kind: 'thinking', label: 'Checking availability & wallet' },
    { kind: 'assistant', text: reply },
    { kind: 'card' },
  ]
}

export default function AISection() {
  const { user, isAuthenticated } = useAuth()
  const firstName = isAuthenticated ? user?.firstName || null : null

  const script = buildScript(firstName)

  // Step through the demo one bubble at a time for a small "live"
  // feel. Resets once the booking card lands.
  const [visible, setVisible] = useState(1)

  useEffect(() => {
    setVisible(1)
  }, [firstName])

  useEffect(() => {
    const total = script.length
    const interval = setInterval(() => {
      setVisible((v) => (v >= total ? 1 : v + 1))
    }, 1800)
    return () => clearInterval(interval)
  }, [script.length])

  const shown = script.slice(0, visible)

  // Capability bullets that sell the "it does everything for you"
  // promise without using the word "memory". Personalizes the second
  // bullet when we know the user so the list reads a touch closer.
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
      copy: firstName
        ? 'Top up, check balance, or pay for a visit without leaving the chat.'
        : 'Top up, check balance, or pay for a visit without leaving the chat.',
    },
    {
      icon: <MessageSquare className="w-4 h-4" />,
      title: 'Answers every question, 24/7',
      copy: 'From skin concerns to pricing, directions and after-care — always on, by text or voice.',
    },
  ]

  return (
    <section
      className="py-12 md:py-16 bg-white overflow-hidden"
      aria-labelledby="derma-ai-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4">
        {/* Shared SectionHeader — guarantees the heading size, badge
            style, and underline curve match every other section on
            the homepage. Personalizes the badge for signed-in users. */}
        <SectionHeader
          badge={firstName ? `Welcome back, ${firstName}` : 'Your personal concierge'}
          title={firstName ? 'Anything you need,' : 'One message.'}
          highlight={firstName ? 'handled' : 'Anything handled.'}
          description={
            firstName
              ? `Your Derma AI can book, reschedule, top up your wallet, and answer anything — just tell it what you need, ${firstName}.`
              : 'Derma AI can book, reschedule, top up your wallet, and answer anything about your care — all in a single chat, 24/7.'
          }
        />

        {/* Two-column layout — mirrors laser-section / booking-section
            for visual consistency across the homepage. On mobile the
            phone sits above the copy so the product is the first
            thing visitors see. */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* ------------------- Left: copy + bullets + CTA ---------------- */}
          <div className="order-2 lg:order-1">
            <h3 id="derma-ai-heading" className="sr-only">
              Meet Derma AI
            </h3>

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

            {/* Quiet trust row — three tight proof chips in the same
                text-xs weight as the rest of the homepage proof rows. */}
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

          {/* ------------------- Right: phone mockup ---------------- */}
          <div className="order-1 lg:order-2 flex justify-center">
            <PhoneMockup shown={shown} firstName={firstName} />
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------- Phone mockup --------------------------
 *
 * A device-framed render of the real Derma AI chat so visitors see
 * exactly what they'll open on their phone. The frame gets a soft
 * brand-tinted shadow so it lifts off the page without the section
 * needing a background color change.
 * ---------------------------------------------------------------- */

function PhoneMockup({ shown, firstName }: { shown: DemoStep[]; firstName: string | null }) {
  return (
    <div className="relative">
      {/* Ambient brand glow behind the device — a single radial wash,
          no gradient on the device itself. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 rounded-[60px] bg-[radial-gradient(ellipse_at_center,rgba(123,45,142,0.18),transparent_65%)] blur-2xl"
      />

      {/* Device outer frame — titanium-style bezel in soft charcoal
          with a subtle inner highlight. Fixed width keeps the mockup
          feeling handheld on desktop; scales down fluidly on mobile. */}
      <div className="relative w-[280px] sm:w-[300px] rounded-[44px] bg-gray-900 p-[10px] shadow-[0_30px_60px_-25px_rgba(123,45,142,0.35),0_10px_30px_-10px_rgba(17,24,39,0.35)]">
        {/* Subtle inner bezel highlight for realism. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[3px] rounded-[41px] ring-1 ring-white/5"
        />

        {/* Screen */}
        <div className="relative rounded-[36px] bg-white overflow-hidden aspect-[9/19.5]">
          {/* Dynamic-island style notch */}
          <div
            aria-hidden="true"
            className="absolute top-2 left-1/2 -translate-x-1/2 h-6 w-24 rounded-full bg-gray-900 z-20"
          />

          {/* Status bar */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-3 pb-2 text-[10px] font-semibold text-gray-900">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded-sm bg-gray-900" />
              <span className="inline-block w-2 h-2 rounded-full border border-gray-900" />
              <span className="inline-block w-4 h-2 rounded-sm bg-gray-900" />
            </span>
          </div>

          {/* Chat — identical header/canvas/composer to the real app */}
          <ChatScreen shown={shown} firstName={firstName} />
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

function ChatScreen({ shown, firstName }: { shown: DemoStep[]; firstName: string | null }) {
  return (
    <div className="flex flex-col h-[calc(100%-26px)]">
      {/* Brand header — matches the real derma-ai.tsx header. */}
      <div className="relative px-3.5 py-2.5 bg-[#7B2D8E] text-white overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
            <ButterflyLogo className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold leading-none">Derma AI</p>
            <p className="text-[9px] text-white/70 leading-none mt-1 tracking-wide">
              {firstName ? `Ready for you, ${firstName}` : 'Books, reschedules, answers'}
            </p>
          </div>
          <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
            <Mic className="w-3 h-3 text-white" />
          </span>
        </div>
      </div>

      {/* Canvas — subtle brand wash, same as the real chat. */}
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-[#7B2D8E]/[0.035] via-gray-50 to-gray-50 px-3 py-3">
        <div className="space-y-2.5">
          {shown.map((step, i) => (
            <StepBubble key={`${i}-${step.kind}`} step={step} />
          ))}
        </div>
      </div>

      {/* Composer — faithful static render. */}
      <div className="border-t border-gray-100 bg-white px-2.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500"
            aria-label="Attach"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 h-8 rounded-full bg-gray-100 flex items-center px-3 text-[10px] text-gray-400 truncate">
            {firstName ? `Ask anything, ${firstName}…` : 'Ask Derma anything…'}
          </div>
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded-full text-[#7B2D8E]"
            aria-label="Voice"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center"
            aria-label="Send"
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

  // Booking-slots card — same structure the real assistant emits.
  return (
    <div className={`${base} flex items-end gap-1.5`}>
      <div className="w-5" aria-hidden="true" />
      <div className="flex-1 max-w-[92%] bg-white rounded-xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-100">
          <div className="w-5 h-5 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
            <Calendar className="w-2.5 h-2.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-semibold text-gray-900 leading-none truncate">
              Deep Cleansing Facial
            </p>
            <p className="text-[8px] text-gray-500 leading-none mt-0.5 truncate">
              Ikoyi · Sat 12 Apr
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
