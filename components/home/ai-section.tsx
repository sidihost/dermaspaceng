'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, MapPin, Mic, Paperclip, Send, Sparkles, Wallet } from 'lucide-react'

// Butterfly glyph — the brand mark used across the assistant. Kept
// inline so this section has no external icon dependency.
function ButterflyLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M16 4c-3.3 0-6 2.7-6 6 0 2 1 3.7 2.4 4.9-.8.4-1.7 1.1-2.4 1.7-2-1.6-4.7-2.6-7.3-2.6-.8 0-1.3.5-1.3 1.3s.5 1.3 1.3 1.3c1.9 0 3.6.7 5.1 1.7C6 20 5.3 22.3 5.3 24.7c0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-1.9.5-3.6 1.5-5.1.7.4 1.5.8 2.3 1.1-.7 1.5-1.1 3.2-1.1 4.9 0 3.3 2.7 5.7 5.3 5.7s5.3-2.4 5.3-5.7c0-1.7-.4-3.5-1.1-4.9.8-.3 1.6-.7 2.3-1.1 1 1.5 1.5 3.2 1.5 5.1 0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-2.4-.7-4.7-2.4-6.3 1.5-1 3.2-1.7 5.1-1.7.8 0 1.3-.5 1.3-1.3s-.5-1.3-1.3-1.3c-2.7 0-5.3 1.1-7.3 2.6-.7-.7-1.6-1.3-2.4-1.7C21 13.7 22 12 22 10c0-3.3-2.7-6-6-6zm0 2.7c1.9 0 3.3 1.5 3.3 3.3S17.9 13.3 16 13.3s-3.3-1.5-3.3-3.3S14.1 6.7 16 6.7z" />
    </svg>
  )
}

// --- Demo script ------------------------------------------------------
// What the visitor sees cycle through the phone. Designed to feel like
// a real concierge conversation: the user asks a small question, Derma
// replies warmly, then actively renders a tool result (the booking
// slots card) — same behaviour the real assistant has in-app. Steps
// are short so the demo feels snappy.
type DemoStep =
  | { kind: 'user'; text: string }
  | { kind: 'thinking'; label: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'card' }

const DEMO_SCRIPT: DemoStep[] = [
  { kind: 'user', text: 'What facial do you recommend for acne?' },
  { kind: 'thinking', label: 'Matching your skin profile' },
  {
    kind: 'assistant',
    text:
      'For breakout-prone skin I love our Deep Cleansing Facial — extraction, calming mask and LED therapy in one sitting.',
  },
  { kind: 'user', text: 'Can I book for Saturday at Ikoyi?' },
  { kind: 'thinking', label: 'Checking Saturday availability' },
  {
    kind: 'assistant',
    text: 'Yes — three slots still open at Ikoyi this Saturday. Tap the one you&rsquo;d like.',
  },
  { kind: 'card' },
]

export default function AISection() {
  // `visible` advances one step at a time to animate the conversation
  // in. When we reach the end we pause, then reset. All indexes are
  // inclusive — `messages.slice(0, visible)`.
  const [visible, setVisible] = useState(1)

  useEffect(() => {
    if (visible >= DEMO_SCRIPT.length) {
      // Hold the finished conversation on-screen for a beat, then reset.
      const t = setTimeout(() => setVisible(1), 4200)
      return () => clearTimeout(t)
    }
    const next = DEMO_SCRIPT[visible]
    // Thinking steps linger briefly; everything else advances faster.
    const delay = next?.kind === 'thinking' ? 1400 : 1800
    const t = setTimeout(() => setVisible((v) => v + 1), delay)
    return () => clearTimeout(t)
  }, [visible])

  const steps = DEMO_SCRIPT.slice(0, visible)

  return (
    <section
      id="derma-ai"
      className="relative py-16 md:py-24 bg-white overflow-hidden"
      aria-labelledby="derma-ai-heading"
    >
      {/* Soft brand wash in the corners — adds depth without introducing
          another color. Kept subtle (under 6% opacity) so the section
          still reads as white. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[#7B2D8E]/5 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-20 w-96 h-96 rounded-full bg-[#7B2D8E]/5 blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1.05fr,1fr] gap-12 lg:gap-16 items-center">
          {/* ── Left: editorial copy column ───────────────────────── */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#7B2D8E]/10 rounded-full mb-5 ring-1 ring-[#7B2D8E]/15">
              <ButterflyLogo className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#7B2D8E]">
                Derma AI Concierge
              </span>
            </div>

            <h2
              id="derma-ai-heading"
              className="text-[28px] md:text-[40px] lg:text-[44px] leading-[1.05] font-semibold text-gray-900 tracking-tight text-balance"
            >
              A personal skincare{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#7B2D8E]">concierge</span>
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 bottom-1 h-2 bg-[#7B2D8E]/15 rounded-full -z-0"
                />
              </span>
              , in your pocket.
            </h2>

            <p className="mt-4 text-[15px] md:text-base text-gray-600 leading-relaxed text-pretty">
              Derma AI knows your skin, remembers your preferences, and books, cancels
              and pays for you — in chat or by voice. Built with our therapists, tuned
              for Nigerian skin.
            </p>

            {/* Feature list — cleaner than the previous check-rows.
                Each item has a purple icon tile, a short title and a
                one-line benefit. Spacing is generous (py-3) so the
                rhythm feels editorial rather than a checklist. */}
            <ul className="mt-7 space-y-3">
              {[
                {
                  icon: Sparkles,
                  title: 'Remembers you across chats',
                  desc: 'Skin type, allergies, favourite branch — saved privately and editable in settings.',
                },
                {
                  icon: Calendar,
                  title: 'Books & cancels in one tap',
                  desc: 'Real availability, real prices — no phone call, no back-and-forth.',
                },
                {
                  icon: Mic,
                  title: 'Voice-first, Nigerian-tuned',
                  desc: 'Speak naturally. Derma listens, answers, and reads important details aloud.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 w-9 h-9 rounded-xl bg-[#7B2D8E]/10 ring-1 ring-[#7B2D8E]/15 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {title}
                    </p>
                    <p className="text-[13px] text-gray-500 leading-snug mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Trust row — a compact stat strip that ends the column
                with a small proof point. Three divided cells, no cards,
                no shadows. */}
            <dl className="mt-8 grid grid-cols-3 gap-4 sm:gap-6 pt-6 border-t border-gray-100">
              {[
                { value: '24/7', label: 'Always on' },
                { value: '<2s', label: 'Avg. reply' },
                { value: '100+', label: 'Services indexed' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="text-xl md:text-2xl font-semibold text-gray-900 tabular-nums leading-none">
                    {stat.value}
                  </dd>
                  <p className="text-[11px] text-gray-500 mt-1.5 tracking-wide">
                    {stat.label}
                  </p>
                </div>
              ))}
            </dl>

            {/* CTAs — primary brand pill + ghost link. The primary
                routes straight into the dashboard so signed-in users
                land in Derma; guests get gated by auth on arrival. */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#6B2278] active:scale-[0.98] transition-all"
              >
                <ButterflyLogo className="w-4 h-4" />
                Start chatting
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-full transition-colors"
              >
                Browse services
              </Link>
            </div>
          </div>

          {/* ── Right: phone mockup ─────────────────────────────────
              Uses a minimal device frame (no heavy drop-shadow per
              brand direction) and an authentic recreation of the real
              Derma AI UI — welcome hero, quick-ask chips, and live
              tool-result card. The inner conversation animates step by
              step, then loops. */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Soft brand halo behind the device instead of a shadow. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-[#7B2D8E]/10 blur-3xl"
            />

            <div className="relative w-[290px] md:w-[310px]">
              {/* Device frame */}
              <div className="relative bg-gray-900 rounded-[48px] p-2 ring-1 ring-black/5">
                {/* Side buttons */}
                <span aria-hidden="true" className="absolute -left-[3px] top-24 w-[3px] h-8 bg-gray-800 rounded-l-sm" />
                <span aria-hidden="true" className="absolute -left-[3px] top-36 w-[3px] h-14 bg-gray-800 rounded-l-sm" />
                <span aria-hidden="true" className="absolute -left-[3px] top-56 w-[3px] h-14 bg-gray-800 rounded-l-sm" />
                <span aria-hidden="true" className="absolute -right-[3px] top-32 w-[3px] h-20 bg-gray-800 rounded-r-sm" />

                {/* Screen */}
                <div className="bg-black rounded-[42px] overflow-hidden">
                  <div className="relative bg-white rounded-[38px] overflow-hidden h-[580px] flex flex-col">
                    {/* Dynamic Island */}
                    <div
                      aria-hidden="true"
                      className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20"
                    />

                    {/* iOS status bar — solid brand fill that continues
                        the header beneath, so the top reads as one
                        premium chrome plate. */}
                    <div className="h-9 bg-[#7B2D8E] flex items-end justify-between px-6 pb-1.5">
                      <span className="text-[10px] text-white font-semibold tabular-nums">9:41</span>
                      <div className="flex items-center gap-1 text-white">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" />
                        </svg>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M2 17h20v2H2v-2zm1.15-4.05L4 11.47l.85 1.48 1.3-.75-.85-1.48H7v-1.5H5.3l.85-1.48-1.3-.75L4 8.47l-.85-1.48-1.3.75.85 1.48H1v1.5h1.7l-.85 1.48 1.3.75z" />
                        </svg>
                        <div className="w-6 h-2.5 rounded-[2px] bg-white/90 relative">
                          <span
                            aria-hidden="true"
                            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-0.5 w-0.5 h-1.5 bg-white rounded-r"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Chat header */}
                    <div className="relative px-3 py-2.5 flex items-center justify-between flex-shrink-0 bg-[#7B2D8E] overflow-hidden">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"
                      />
                      <div className="relative flex items-center gap-2.5 min-w-0">
                        <div className="relative w-8 h-8 rounded-lg bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
                          <ButterflyLogo className="w-4 h-4 text-white" />
                          <span
                            aria-hidden="true"
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#7B2D8E]"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white text-[13px] leading-none tracking-tight">
                            Derma AI
                          </h3>
                          <p className="text-[10px] text-white/80 leading-none mt-1.5 tracking-wide">
                            Concierge · remembers 3
                          </p>
                        </div>
                      </div>
                      <div className="relative flex items-center gap-0.5 flex-shrink-0">
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Messages canvas */}
                    <div className="flex-1 overflow-hidden bg-gradient-to-b from-[#7B2D8E]/[0.035] via-gray-50 to-gray-50 px-3 py-3 space-y-2.5">
                      {steps.map((step, idx) => {
                        if (step.kind === 'user') {
                          return (
                            <div
                              key={idx}
                              className="flex justify-end animate-[fadeSlideIn_0.35s_ease-out_both]"
                            >
                              <div className="max-w-[78%] px-3 py-2 text-[11px] leading-snug bg-[#7B2D8E] text-white rounded-2xl rounded-br-md">
                                {step.text}
                              </div>
                            </div>
                          )
                        }
                        if (step.kind === 'assistant') {
                          return (
                            <div
                              key={idx}
                              className="flex justify-start animate-[fadeSlideIn_0.35s_ease-out_both]"
                            >
                              <div className="w-6 h-6 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-1.5 flex-shrink-0 mt-0.5">
                                <ButterflyLogo className="w-3 h-3 text-white" />
                              </div>
                              <div className="max-w-[78%] px-3 py-2 text-[11px] leading-snug bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-200/80 ring-1 ring-[#7B2D8E]/[0.04]">
                                {step.text}
                              </div>
                            </div>
                          )
                        }
                        if (step.kind === 'thinking') {
                          return (
                            <div
                              key={idx}
                              className="flex justify-start animate-[fadeSlideIn_0.25s_ease-out_both]"
                            >
                              <div className="w-6 h-6 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-1.5 flex-shrink-0 mt-0.5">
                                <ButterflyLogo className="w-3 h-3 text-white" />
                              </div>
                              <div className="bg-white border border-gray-200/80 ring-1 ring-[#7B2D8E]/[0.04] rounded-2xl rounded-bl-md px-3 py-2 min-w-[160px]">
                                <span className="block text-[10px] font-medium text-[#7B2D8E] leading-none">
                                  {step.label}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="mt-1.5 block h-0.5 w-full rounded-full bg-[#7B2D8E]/10 overflow-hidden relative"
                                >
                                  <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-[#7B2D8E]/70 rounded-full animate-[shimmerSlide_1.6s_ease-in-out_infinite]" />
                                </span>
                              </div>
                            </div>
                          )
                        }
                        // kind === 'card' — booking result card
                        return (
                          <div
                            key={idx}
                            className="ml-[30px] animate-[fadeSlideIn_0.4s_ease-out_both]"
                          >
                            <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
                              <div className="flex items-center justify-between px-2.5 py-2 border-b border-gray-100">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
                                    <Calendar className="w-3 h-3" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-semibold text-gray-900 leading-none">
                                      Saturday · Ikoyi
                                    </p>
                                    <p className="text-[9px] text-gray-500 mt-0.5 leading-none">
                                      3 slots open
                                    </p>
                                  </div>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[9px] text-[#7B2D8E] font-semibold">
                                  <MapPin className="w-2.5 h-2.5" />
                                  Ikoyi
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 p-2">
                                {['10:00', '14:00', '16:00'].map((time, i) => (
                                  <button
                                    key={time}
                                    type="button"
                                    className={`px-2 py-2 rounded-xl text-[10px] font-semibold transition-colors ${
                                      i === 1
                                        ? 'bg-[#7B2D8E] text-white'
                                        : 'bg-[#7B2D8E]/5 text-[#7B2D8E] hover:bg-[#7B2D8E]/10'
                                    }`}
                                  >
                                    {time}
                                  </button>
                                ))}
                              </div>
                              <div className="px-2.5 pb-2 flex items-center justify-between">
                                <span className="text-[9px] text-gray-500">Deep Cleansing Facial</span>
                                <span className="text-[10px] font-semibold text-[#7B2D8E] tabular-nums">
                                  ₦45,000
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Composer */}
                    <div className="px-3 py-2.5 border-t border-gray-100 bg-white flex-shrink-0">
                      <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1.5">
                        <button
                          type="button"
                          aria-label="Attach"
                          className="w-6 h-6 flex items-center justify-center text-gray-500"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-[10px] text-gray-400 truncate">
                          Ask Derma anything…
                        </span>
                        <button
                          type="button"
                          aria-label="Voice"
                          className="w-6 h-6 flex items-center justify-center text-[#7B2D8E]"
                        >
                          <Mic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Send"
                          className="w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center"
                        >
                          <Send className="w-3 h-3 text-white" />
                        </button>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 mt-1.5">
                        <span
                          aria-hidden="true"
                          className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]"
                        />
                        <p className="text-[8.5px] text-gray-400 leading-tight">
                          Memory on · 3 remembered
                        </p>
                      </div>
                    </div>

                    {/* Home indicator */}
                    <div className="h-5 flex items-center justify-center flex-shrink-0">
                      <div className="w-28 h-1 bg-gray-900 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating feature chips — sit beside the device to
                  amplify the "this AI is smart" story without more
                  copy. On mobile they hide so the phone remains the
                  hero. */}
              <div
                aria-hidden="true"
                className="hidden lg:flex absolute -left-8 top-16 items-center gap-2 px-3 py-1.5 bg-white rounded-full ring-1 ring-gray-200"
              >
                <Wallet className="w-3.5 h-3.5 text-[#7B2D8E]" />
                <span className="text-[11px] font-semibold text-gray-800">
                  Balance: ₦82,400
                </span>
              </div>
              <div
                aria-hidden="true"
                className="hidden lg:flex absolute -right-6 bottom-24 items-center gap-2 px-3 py-1.5 bg-[#7B2D8E] rounded-full text-white"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Remembered your skin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scoped animations. `fadeSlideIn` is a shared in-animation for
          every conversation step; `shimmerSlide` drives the loading
          bar under the thinking bubble. Kept local-scoped so they don't
          collide with anything in globals.css. */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmerSlide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </section>
  )
}
