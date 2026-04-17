'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  Clock,
  ArrowRight,
  Phone,
  Check,
  Gift,
  RefreshCw,
  CalendarCheck,
  CreditCard,
  MapPin,
  Sparkles,
} from 'lucide-react'
import Image from 'next/image'
import SectionHeader from '@/components/shared/section-header'

const BRAND = '#7B2D8E'

const FEATURES = [
  { icon: Calendar, title: '24/7 Scheduling', desc: 'Book a visit any time, day or night' },
  { icon: Clock, title: 'Real-time Slots', desc: 'See live therapist availability' },
  { icon: Gift, title: 'Gift Vouchers', desc: 'Send the gift of glow to someone special' },
  { icon: RefreshCw, title: 'Easy to Manage', desc: 'Reschedule or cancel in a tap' },
]

// A realistic week strip — "Wed 17" is the selected day.
const DAYS = [
  { d: 'Mon', n: 15 },
  { d: 'Tue', n: 16 },
  { d: 'Wed', n: 17, selected: true },
  { d: 'Thu', n: 18 },
  { d: 'Fri', n: 19 },
  { d: 'Sat', n: 20 },
]

const TIME_SLOTS = [
  { time: '10:00', state: 'available' as const },
  { time: '11:30', state: 'taken' as const },
  { time: '1:00',  state: 'available' as const },
  { time: '2:30',  state: 'selected' as const },
  { time: '4:00',  state: 'available' as const },
  { time: '5:30',  state: 'available' as const },
]

// The mockup cycles through 3 stages on loop so the card behaves like
// a short product demo video rather than a static screenshot.
type Stage = 0 | 1 | 2
const STAGE_DURATION_MS = 3200

export default function BookingSection() {
  const [stage, setStage] = useState<Stage>(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setStage((s) => ((s + 1) % 3) as Stage)
    }, STAGE_DURATION_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    // Standard home-section rhythm: 48px mobile, 64px desktop.
    <section
      id="booking-section"
      className="py-12 md:py-16 bg-[#F8F2FB] overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments, purchase gift vouchers, and manage your visits — all from your phone."
        />

        {/* Two-column layout: auto-playing phone demo + features/CTAs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* ---------- PHONE MOCKUP (auto-playing demo) ---------- */}
          <div className="flex justify-center lg:justify-start">
            <PhoneMockup stage={stage} />
          </div>

          {/* ---------- FEATURES + CTAs ---------- */}
          <div className="space-y-6">
            <ul className="space-y-3">
              {FEATURES.map((f) => (
                <li
                  key={f.title}
                  className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-100"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${BRAND}15` }}
                  >
                    <f.icon className="w-5 h-5" style={{ color: BRAND }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900">{f.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="tel:+2349017972919"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white rounded-lg text-sm font-semibold hover:bg-[#6B2278] transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call to Book
              </a>
              <a
                href="https://wa.me/+2349013134945"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#7B2D8E] border border-[#7B2D8E] rounded-lg text-sm font-semibold hover:bg-[#7B2D8E]/5 transition-colors"
              >
                WhatsApp Us
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <p className="text-xs text-gray-500">
              Want early access?{' '}
              <span className="font-semibold text-[#7B2D8E]">
                Call or WhatsApp us
              </span>{' '}
              and we&apos;ll notify you the moment online booking goes live.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Phone mockup — premium auto-playing demo.                          */
/* Now with: ambient gradient halo behind the device, a real device   */
/* shadow with subtle perspective, polished bezel highlight, and      */
/* refined inner content with proper hierarchy & spacing.             */
/* ------------------------------------------------------------------ */
function PhoneMockup({ stage }: { stage: Stage }) {
  return (
    <div className="relative">
      {/* Ambient glow — soft brand-tinted radial gradient that sits behind
          the device. Gives the mockup a sense of place on the lilac
          section background instead of floating in a vacuum. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(123,45,142,0.28) 0%, rgba(123,45,142,0.08) 45%, transparent 70%)',
        }}
      />
      {/* Soft secondary highlight — a tiny warm dot at top-right to
          suggest a light source. Subtle, not gradient-y. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-2 top-6 -z-10 h-32 w-32 rounded-full bg-white/60 blur-2xl"
      />

      <div className="relative w-[290px] md:w-[310px]">
        {/* Outer device frame — gradient bezel + real shadow + inner
            highlight ring so it reads as a physical object. */}
        <div
          className="rounded-[44px] p-[3px]"
          style={{
            background:
              'linear-gradient(160deg, #2a2a2e 0%, #0a0a0c 35%, #1a1a1e 70%, #2a2a2e 100%)',
            boxShadow:
              '0 30px 60px -20px rgba(40, 10, 50, 0.45), 0 18px 30px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.04) inset',
          }}
        >
          <div
            className="rounded-[42px] p-2"
            style={{
              background:
                'linear-gradient(180deg, #0a0a0c 0%, #14141a 50%, #0a0a0c 100%)',
            }}
          >
            {/* Screen */}
            <div
              className="relative bg-white rounded-[34px] overflow-hidden"
              style={{
                boxShadow:
                  '0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              {/* Status bar */}
              <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] font-semibold text-gray-900">
                <span className="tracking-tight">9:41</span>
                <div className="flex items-center gap-1">
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
                    <rect x="0" y="7" width="2" height="3" rx="0.5" />
                    <rect x="3" y="5" width="2" height="5" rx="0.5" />
                    <rect x="6" y="3" width="2" height="7" rx="0.5" />
                    <rect x="9" y="1" width="2" height="9" rx="0.5" />
                  </svg>
                  <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
                    <rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="currentColor" />
                    <rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor" />
                    <rect x="19.5" y="3" width="1.5" height="4" rx="0.5" fill="currentColor" />
                  </svg>
                </div>
              </div>

              {/* Notch — refined pill island */}
              <div className="flex justify-center pb-2.5">
                <div className="w-24 h-[22px] bg-black rounded-full" />
              </div>

              {/* App header — kept compact so demo content gets the spotlight. */}
              <div className="px-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F8F2FB] to-white flex items-center justify-center border border-[#7B2D8E]/10">
                    <Image
                      src="/images/dermaspace-logo.png"
                      alt="Dermaspace"
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[11px] font-bold text-gray-900">
                      Book Appointment
                    </p>
                    <p className="text-[8px] text-gray-400 font-medium">
                      Step {stage + 1} of 3
                    </p>
                  </div>
                </div>
                <div className="relative w-7 h-7 rounded-full bg-[#F8F2FB] flex items-center justify-center border border-[#7B2D8E]/10">
                  <CalendarCheck className="w-3.5 h-3.5 text-[#7B2D8E]" />
                </div>
              </div>

              {/* Animated body — fixed height so the card doesn't jump. */}
              <div className="relative h-[360px] px-4 pb-4">
                <DemoStage active={stage === 0}>
                  <TreatmentStage />
                </DemoStage>
                <DemoStage active={stage === 1}>
                  <SlotStage />
                </DemoStage>
                <DemoStage active={stage === 2}>
                  <ConfirmedStage />
                </DemoStage>
              </div>

              {/* Home indicator */}
              <div className="flex items-center justify-center pb-2">
                <div className="w-28 h-1 bg-gray-900 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Stage indicator pills */}
        <div
          className="mt-4 flex items-center justify-center gap-1.5"
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === stage ? 'w-6 bg-[#7B2D8E]' : 'w-1.5 bg-[#7B2D8E]/25'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function DemoStage({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`absolute inset-0 px-4 pb-4 transition-all duration-500 ease-out ${
        active
          ? 'opacity-100 translate-y-0'
          : 'pointer-events-none opacity-0 translate-y-1'
      }`}
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}

/* ---------- Stage 1: selected treatment + date picker ---------- */
function TreatmentStage() {
  return (
    <div className="flex h-full flex-col">
      {/* Selected treatment card — gradient brand surface with a soft
          decorative orb. Adds depth without being garish. */}
      <div
        className="rounded-2xl text-white p-3.5 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #8B3A9F 0%, #7B2D8E 50%, #5A1E6B 100%)',
          boxShadow: '0 8px 20px -8px rgba(123, 45, 142, 0.45)',
        }}
      >
        <div
          aria-hidden
          className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5"
        />
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-2.5 h-2.5 text-white/80" />
            <p className="text-[9px] uppercase tracking-wider text-white/80 font-semibold">
              Selected Treatment
            </p>
          </div>
          <h4 className="text-[15px] font-bold mt-1 leading-tight">
            Signature Glow Facial
          </h4>
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-white/85">
              <Clock className="w-3 h-3" />
              <span>60 min</span>
              <span className="text-white/40">·</span>
              <MapPin className="w-3 h-3" />
              <span>VI</span>
            </div>
            <span className="text-sm font-bold tabular-nums">₦45,000</span>
          </div>
        </div>
      </div>

      <div className="mt-3.5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-gray-900">April 2026</p>
          <p className="text-[9px] text-gray-400 font-medium">This week</p>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {DAYS.map((d) => (
            <div
              key={d.n}
              className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all ${
                d.selected
                  ? 'bg-[#7B2D8E] text-white shadow-md shadow-[#7B2D8E]/25'
                  : 'bg-gray-50 text-gray-700 border border-gray-100'
              }`}
            >
              <span
                className={`text-[8px] font-semibold ${
                  d.selected ? 'text-white/85' : 'text-gray-400'
                }`}
              >
                {d.d}
              </span>
              <span className="text-xs font-bold leading-none mt-1 tabular-nums">
                {d.n}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <FakeCta label="Pick a time" />
      </div>
    </div>
  )
}

/* ---------- Stage 2: time slot picker ---------- */
function SlotStage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-gray-900">
          Available times
        </p>
        <p className="text-[9px] text-gray-400 font-medium">Wed, Apr 17</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {TIME_SLOTS.map((s) => {
          const base =
            'text-[10px] font-semibold py-2.5 rounded-lg text-center border transition-all tabular-nums'
          if (s.state === 'selected') {
            return (
              <div
                key={s.time}
                className={`${base} bg-[#7B2D8E] text-white border-[#7B2D8E] shadow-md shadow-[#7B2D8E]/25 flex items-center justify-center gap-1`}
              >
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                {s.time}
              </div>
            )
          }
          if (s.state === 'taken') {
            return (
              <div
                key={s.time}
                className={`${base} bg-gray-50 text-gray-300 border-gray-100 line-through`}
              >
                {s.time}
              </div>
            )
          }
          return (
            <div
              key={s.time}
              className={`${base} bg-white text-gray-700 border-gray-200`}
            >
              {s.time}
            </div>
          )
        })}
      </div>

      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-[#F8F2FB] flex items-center justify-center flex-shrink-0">
              <Calendar className="h-2.5 w-2.5 text-[#7B2D8E]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-900 truncate">
              Signature Glow Facial
            </span>
          </div>
          <span className="text-[11px] font-bold text-gray-900 tabular-nums">
            ₦45,000
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#F8F2FB] flex items-center justify-center flex-shrink-0">
              <Clock className="h-2.5 w-2.5 text-[#7B2D8E]" />
            </div>
            <span className="text-[10px] text-gray-600">
              Wed, Apr 17 · 2:30 PM
            </span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-gray-500 font-medium">
            <CreditCard className="h-2.5 w-2.5" />
            Wallet
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <FakeCta label="Continue to Checkout" />
      </div>
    </div>
  )
}

/* ---------- Stage 3: confirmation ---------- */
function ConfirmedStage() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      {/* Brand purple success state with concentric rings for depth. */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -m-3 rounded-full bg-[#7B2D8E]/5"
        />
        <div
          aria-hidden
          className="absolute inset-0 -m-1.5 rounded-full bg-[#7B2D8E]/10"
        />
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background:
              'linear-gradient(135deg, #8B3A9F 0%, #7B2D8E 60%, #5A1E6B 100%)',
            boxShadow: '0 8px 20px -6px rgba(123, 45, 142, 0.5)',
          }}
        >
          <Check className="h-8 w-8 text-white" strokeWidth={3} />
        </div>
      </div>
      <h4 className="mt-4 text-sm font-bold text-gray-900">
        Booking confirmed
      </h4>
      <p className="mt-0.5 text-[11px] text-gray-500">
        We&apos;ve sent a receipt to your email
      </p>

      <div className="mt-4 w-full rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-900">
            Signature Glow Facial
          </span>
          <span className="text-[11px] font-bold text-gray-900 tabular-nums">
            ₦45,000
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />
            Victoria Island
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            Wed · 2:30 PM
          </span>
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F8F2FB] px-2.5 py-1">
        <span className="text-[9px] font-semibold text-[#7B2D8E] tracking-wide">
          REF
        </span>
        <span className="text-[9px] text-gray-600 font-mono">
          DS-2026-00017
        </span>
      </div>
    </div>
  )
}

/* ---------- In-screen CTA ---------- */
function FakeCta({ label }: { label: string }) {
  return (
    <div
      className="w-full py-3 rounded-xl text-white text-[11px] font-bold flex items-center justify-center gap-1.5"
      style={{
        background: 'linear-gradient(135deg, #8B3A9F 0%, #7B2D8E 100%)',
        boxShadow: '0 6px 14px -4px rgba(123, 45, 142, 0.4)',
      }}
    >
      {label}
      <ArrowRight className="w-3 h-3" />
    </div>
  )
}
