'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  MapPin,
  MessageSquare,
  Mic,
  Paperclip,
  Send,
  Wallet,
} from 'lucide-react'

/* ------------------------------------------------------------------
 * Homepage "Derma AI" showcase section.
 *
 * Direction after feedback: return to the simpler single-mockup flow
 * the previous version used — centered editorial intro + one gorgeous
 * chat card underneath — but crank up the craft. No phone frame, no
 * stat strip, no sparkle icons, no green accents. Just the real
 * assistant's visual language (brand purple header, avatar with live
 * dot, soft message bubbles, shimmer loader, real tool-result card)
 * rendered at hero scale so visitors can see exactly what they get.
 * ------------------------------------------------------------------ */

function ButterflyLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M16 4c-3.3 0-6 2.7-6 6 0 2 1 3.7 2.4 4.9-.8.4-1.7 1.1-2.4 1.7-2-1.6-4.7-2.6-7.3-2.6-.8 0-1.3.5-1.3 1.3s.5 1.3 1.3 1.3c1.9 0 3.6.7 5.1 1.7C6 20 5.3 22.3 5.3 24.7c0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-1.9.5-3.6 1.5-5.1.7.4 1.5.8 2.3 1.1-.7 1.5-1.1 3.2-1.1 4.9 0 3.3 2.7 5.7 5.3 5.7s5.3-2.4 5.3-5.7c0-1.7-.4-3.5-1.1-4.9.8-.3 1.6-.7 2.3-1.1 1 1.5 1.5 3.2 1.5 5.1 0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-2.4-.7-4.7-2.4-6.3 1.5-1 3.2-1.7 5.1-1.7.8 0 1.3-.5 1.3-1.3s-.5-1.3-1.3-1.3c-2.7 0-5.3 1.1-7.3 2.6-.7-.7-1.6-1.3-2.4-1.7C21 13.7 22 12 22 10c0-3.3-2.7-6-6-6zm0 2.7c1.9 0 3.3 1.5 3.3 3.3S17.9 13.3 16 13.3s-3.3-1.5-3.3-3.3S14.1 6.7 16 6.7z" />
    </svg>
  )
}

/* -------------------- Animated conversation demo ------------------- */
// The mockup runs a short, tight script of a real concierge exchange.
// We step forward every ~1.5s and reset after the final card so the
// section is always "alive" when a visitor scrolls past.
type DemoStep =
  | { kind: 'user'; text: string }
  | { kind: 'thinking'; label: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'card' }

const DEMO_SCRIPT: DemoStep[] = [
  { kind: 'user', text: 'Can I book a facial for Saturday at Ikoyi?' },
  { kind: 'thinking', label: 'Checking Saturday availability' },
  {
    kind: 'assistant',
    text:
      'Yes — three slots still open at Ikoyi this Saturday. Tap the one you\u2019d like and I\u2019ll confirm it.',
  },
  { kind: 'card' },
]

export default function AISection() {
  // Advances one step at a time to animate the script in. When we
  // reach the final card we pause for a beat, then reset.
  const [visible, setVisible] = useState(1)

  useEffect(() => {
    const total = DEMO_SCRIPT.length
    const interval = setInterval(() => {
      setVisible((v) => {
        if (v >= total) return 1
        return v + 1
      })
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  const shown = DEMO_SCRIPT.slice(0, visible)

  return (
    <section
      className="relative bg-white py-20 sm:py-28 overflow-hidden"
      aria-labelledby="derma-ai-heading"
    >
      {/* Soft ambient brand glow — a single pale radial wash behind
          everything. Keeps the section premium without gradients in
          the content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(123,45,142,0.08),transparent_60%)]"
      />

      <div className="relative max-w-4xl mx-auto px-5 sm:px-6 text-center">
        {/* Eyebrow pill — brand-on-brand, anchored to the butterfly mark
            so it ties back to the real assistant's avatar language. */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/8 border border-[#7B2D8E]/15">
          <ButterflyLogo className="w-3.5 h-3.5 text-[#7B2D8E]" />
          <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#7B2D8E]">
            Derma AI · Concierge
          </span>
        </div>

        {/* Display headline — "mill-worthy", wrapped in text-balance so
            the two-line break falls naturally across widths. The word
            "knows you" wears a hand-drawn brand underline to punctuate
            the promise without adding a second color. */}
        <h2
          id="derma-ai-heading"
          className="mt-6 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-gray-900 leading-[1.05] text-balance"
        >
          A spa assistant that
          <br className="hidden sm:block" />{' '}
          <span className="relative inline-block">
            actually knows you.
            <svg
              className="absolute left-0 right-0 -bottom-1 w-full h-2.5 text-[#7B2D8E]"
              viewBox="0 0 240 10"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M2 6 Q 60 1, 120 5 T 238 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h2>

        <p className="mt-5 text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto text-pretty">
          Derma AI remembers your skin, your branch, and your preferences —
          then books, checks your wallet and answers on your behalf, 24/7.
        </p>

        {/* CTA row — primary leads to the assistant, secondary opens the
            concierge deep-dive page. Both are pill-shaped to echo the
            real in-app button language. */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/derma-ai"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-full font-semibold text-[14px] hover:bg-[#6B2278] transition-colors"
          >
            Try Derma AI
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-full font-semibold text-[14px] hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors"
          >
            Browse services
          </Link>
        </div>
      </div>

      {/* ---------------- Chat mockup (the hero artefact) ---------------- */}
      <div className="relative mt-14 sm:mt-16 max-w-lg mx-auto px-5 sm:px-0">
        {/* Floating capability chips — decorative on desktop only so
            they don't fight the card on mobile. Each chip mirrors one
            of the assistant's real tool-outputs, signalling "this
            isn't a chatbot, it does things". Uses only brand purple
            + neutral grays. */}
        <FloatingChip
          className="hidden lg:flex absolute -left-44 top-10"
          icon={<Wallet className="w-3.5 h-3.5" />}
          label="Wallet balance"
          value="₦ 82,400"
          delay={400}
        />
        <FloatingChip
          className="hidden lg:flex absolute -right-40 top-32"
          icon={<Calendar className="w-3.5 h-3.5" />}
          label="Next visit"
          value="Sat · 2:00 PM"
          delay={900}
        />
        <FloatingChip
          className="hidden lg:flex absolute -right-48 bottom-20"
          icon={<MapPin className="w-3.5 h-3.5" />}
          label="Your branch"
          value="Ikoyi · Lagos"
          delay={1400}
        />
        <FloatingChip
          className="hidden lg:flex absolute -left-52 bottom-32"
          icon={<MessageSquare className="w-3.5 h-3.5" />}
          label="Remembers"
          value="Oily skin · fragrance free"
          delay={1900}
        />

        <ChatMockup shown={shown} />
      </div>
    </section>
  )
}

/* -------------------------- Chat mockup -------------------------- */

function ChatMockup({ shown }: { shown: DemoStep[] }) {
  return (
    <div className="relative rounded-[28px] bg-white border border-gray-200/80 overflow-hidden">
      {/* Header — flat brand bar that mirrors the real assistant's
          header exactly (avatar, live dot, context subtitle, three
          ghost controls). The soft white radial blur top-right adds
          dimensionality without a gradient. */}
      <div className="relative px-4 py-3 bg-[#7B2D8E] text-white overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
            <ButterflyLogo className="w-4 h-4 text-white" />
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#7B2D8E]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-none">Derma AI</p>
            <p className="text-[11px] text-white/70 leading-none mt-1.5 tracking-wide">
              Concierge · remembers 4
            </p>
          </div>
          {/* Ghost control cluster — purely decorative in the mockup. */}
          <div className="flex items-center gap-0.5">
            <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-white" />
            </span>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center">
              <span className="w-3.5 h-[1.5px] bg-white/70 rounded-full" />
              <span className="sr-only">Close</span>
            </span>
          </div>
        </div>
      </div>

      {/* Canvas — same barely-there brand wash we use on the real
          chat. Keeps the mockup grounded in the actual product. */}
      <div className="bg-gradient-to-b from-[#7B2D8E]/[0.035] via-gray-50 to-gray-50 px-4 py-5 min-h-[340px]">
        <div className="space-y-3">
          {shown.map((step, i) => (
            <StepBubble key={`${i}-${step.kind}`} step={step} />
          ))}
        </div>
      </div>

      {/* Composer — a faithful static render of the real input bar:
          paperclip, input hint, voice, brand send button. Gives the
          viewer a clear "you'll type here" mental model. */}
      <div className="border-t border-gray-100 bg-white px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
            aria-label="Attach"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <div className="flex-1 h-10 rounded-full bg-gray-100 flex items-center px-4 text-[13px] text-gray-400">
            Ask Derma anything…
          </div>
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
            aria-label="Voice"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-[#7B2D8E] hover:bg-[#6B2278] text-white flex items-center justify-center transition-colors"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {/* Memory footnote — reassures visitors that the AI carries
            context across sessions, on brand. */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" aria-hidden="true" />
          <p className="text-[10px] text-gray-500 leading-tight">
            Memory on · 4 things remembered about you
          </p>
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
        <div className="max-w-[80%] bg-[#7B2D8E] text-white rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          {step.text}
        </div>
      </div>
    )
  }

  if (step.kind === 'thinking') {
    return (
      <div className={`${base} flex items-end gap-2`}>
        <AvatarBubble />
        <div className="bg-white border border-gray-200/80 ring-1 ring-[#7B2D8E]/[0.04] rounded-2xl rounded-bl-md px-3.5 py-2.5 min-w-[200px]">
          <span className="block text-xs font-medium text-[#7B2D8E] leading-none">
            {step.label}…
          </span>
          <span
            aria-hidden="true"
            className="mt-2 block h-0.5 w-full rounded-full bg-[#7B2D8E]/10 overflow-hidden relative"
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
        <div className="max-w-[80%] bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-200/80 ring-1 ring-[#7B2D8E]/[0.04] px-3.5 py-2.5 text-[13.5px] leading-relaxed">
          {step.text}
        </div>
      </div>
    )
  }

  // Booking slot card — the "render action" beat. Three selectable
  // time chips with a price tag. Looks identical to what the real
  // assistant emits after calling getAvailability.
  return (
    <div className={`${base} flex items-end gap-2`}>
      <div className="w-6" aria-hidden="true" />
      <div className="flex-1 max-w-[90%] bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 leading-none">
              Deep Cleansing Facial
            </p>
            <p className="text-[10px] text-gray-500 leading-none mt-1">
              Ikoyi · Saturday 12 April
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#7B2D8E] tabular-nums">
            ₦ 28,000
          </span>
        </div>
        <div className="px-3 py-2.5 grid grid-cols-3 gap-1.5">
          {['10:30 AM', '12:00 PM', '2:00 PM'].map((t, i) => (
            <button
              key={t}
              type="button"
              className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                i === 2
                  ? 'bg-[#7B2D8E] text-white'
                  : 'bg-[#7B2D8E]/8 text-[#7B2D8E] hover:bg-[#7B2D8E]/15'
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
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7B2D8E] flex items-center justify-center">
      <ButterflyLogo className="w-3 h-3 text-white" />
    </div>
  )
}

/* ---------------- Floating capability chip (desktop) ---------------- */

function FloatingChip({
  className = '',
  icon,
  label,
  value,
  delay = 0,
}: {
  className?: string
  icon: React.ReactNode
  label: string
  value: string
  delay?: number
}) {
  return (
    <div
      className={`${className} items-center gap-2.5 px-3 py-2 bg-white border border-gray-200 rounded-xl ring-1 ring-[#7B2D8E]/[0.04] animate-[derma-msg-in_0.6s_ease-out_both]`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-400">
          {label}
        </span>
        <span className="block text-[12px] font-semibold text-gray-900 leading-tight whitespace-nowrap">
          {value}
        </span>
      </span>
    </div>
  )
}
