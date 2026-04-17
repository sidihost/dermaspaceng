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
  MapPin,
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

type Stage = 0 | 1 | 2
const STAGE_DURATION_MS = 3600

export default function BookingSection() {
  const [stage, setStage] = useState<Stage>(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setStage((s) => ((s + 1) % 3) as Stage)
    }, STAGE_DURATION_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section
      id="booking-section"
      className="py-12 md:py-20 bg-[#FAF6FC] overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments, purchase gift vouchers, and manage your visits — all from your phone."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* ---------- PHONE MOCKUP ---------- */}
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
/* Phone mockup — restrained, premium.                                */
/* Design language rewritten to feel closer to Linear/Vercel product  */
/* mockups: a single flat matte bezel, no decorative orbs, no         */
/* gradient halos, no concentric rings. One accent color (brand       */
/* purple) used sparingly. Typography does the heavy lifting.         */
/* ------------------------------------------------------------------ */
function PhoneMockup({ stage }: { stage: Stage }) {
  return (
    <div className="relative">
      {/* Single soft drop shadow behind the device. Replaces the previous
          "halo + warm highlight + gradient" stack which read as busy. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[55%] -z-10 h-[380px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[60px] bg-[#7B2D8E]/10 blur-3xl"
      />

      <div className="relative w-[280px] md:w-[300px]">
        {/* Flat matte bezel. No gradient, no inset highlight — keeps the
            eye on the screen content. Just a clean shadow. */}
        <div
          className="rounded-[46px] bg-[#1a1a1d] p-[10px]"
          style={{
            boxShadow:
              '0 30px 60px -25px rgba(26, 26, 29, 0.55), 0 12px 24px -12px rgba(26, 26, 29, 0.35)',
          }}
        >
          {/* Screen */}
          <div className="relative bg-white rounded-[38px] overflow-hidden">
            {/* Status bar */}
            <div className="flex items-center justify-between px-7 pt-3.5 pb-1 text-[10px] font-semibold text-gray-900">
              <span className="tracking-tight tabular-nums">9:41</span>
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

            {/* Dynamic island */}
            <div className="flex justify-center pb-3">
              <div className="w-24 h-[22px] bg-[#1a1a1d] rounded-full" />
            </div>

            {/* App header — simpler, just logo + title, no sub-caption. */}
            <div className="px-6 pb-4 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F8F2FB] flex items-center justify-center">
                <Image
                  src="/images/dermaspace-logo.png"
                  alt="Dermaspace"
                  width={18}
                  height={18}
                  className="object-contain"
                />
              </div>
              <p className="text-[13px] font-bold text-gray-900 tracking-tight">
                Book Appointment
              </p>
            </div>

            {/* Animated body */}
            <div className="relative h-[380px] px-5 pb-5">
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
            <div className="flex items-center justify-center pb-2.5">
              <div className="w-28 h-1 bg-gray-900 rounded-full" />
            </div>
          </div>
        </div>

        {/* Stage indicator — minimal pills */}
        <div
          className="mt-5 flex items-center justify-center gap-1.5"
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === stage ? 'w-6 bg-[#7B2D8E]' : 'w-1 bg-[#7B2D8E]/20'
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
      className={`absolute inset-0 px-5 pb-5 transition-opacity duration-500 ease-out ${
        active ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}

/* ---------- Stage 1: selected treatment + date picker ---------- */
/* Flat brand surface, no decorative orbs. Generous padding, large   */
/* price as the key value. Calendar strip uses larger, more legible  */
/* day numbers with a single brand-filled selection.                 */
function TreatmentStage() {
  return (
    <div className="flex h-full flex-col">
      <div className="rounded-2xl bg-[#7B2D8E] text-white p-4">
        <p className="text-[9px] uppercase tracking-[0.14em] text-white/70 font-semibold">
          Selected Treatment
        </p>
        <h4 className="text-[17px] font-bold mt-1.5 leading-[1.15] tracking-tight">
          Signature Glow Facial
        </h4>
        <div className="mt-4 flex items-end justify-between">
          <div className="flex items-center gap-2.5 text-[11px] text-white/80">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              60 min
            </span>
            <span className="text-white/30">•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Victoria Island
            </span>
          </div>
          <span className="text-[17px] font-bold tabular-nums leading-none">
            ₦45,000
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[12px] font-bold text-gray-900">April 2026</p>
          <p className="text-[10px] text-gray-400 font-medium">This week</p>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {DAYS.map((d) => (
            <div
              key={d.n}
              className={`flex flex-col items-center justify-center py-2.5 rounded-lg ${
                d.selected
                  ? 'bg-[#7B2D8E] text-white'
                  : 'bg-gray-50 text-gray-700'
              }`}
            >
              <span
                className={`text-[9px] font-semibold uppercase tracking-wider ${
                  d.selected ? 'text-white/70' : 'text-gray-400'
                }`}
              >
                {d.d}
              </span>
              <span className="text-[15px] font-bold leading-none mt-1 tabular-nums">
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
/* Bigger touch targets, clearer selected state (fill + check), flat */
/* summary row without icon chips that were adding visual noise.     */
function SlotStage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-bold text-gray-900">Available times</p>
        <p className="text-[10px] text-gray-400 font-medium">Wed, Apr 17</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TIME_SLOTS.map((s) => {
          const base =
            'text-[11px] font-semibold py-3 rounded-lg text-center tabular-nums transition-colors'
          if (s.state === 'selected') {
            return (
              <div
                key={s.time}
                className={`${base} bg-[#7B2D8E] text-white flex items-center justify-center gap-1`}
              >
                <Check className="w-3 h-3" strokeWidth={3} />
                {s.time}
              </div>
            )
          }
          if (s.state === 'taken') {
            return (
              <div
                key={s.time}
                className={`${base} bg-gray-50 text-gray-300 line-through`}
              >
                {s.time}
              </div>
            )
          }
          return (
            <div
              key={s.time}
              className={`${base} bg-white text-gray-800 border border-gray-200`}
            >
              {s.time}
            </div>
          )
        })}
      </div>

      <div className="mt-5 rounded-xl bg-gray-50 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">
            Treatment
          </span>
          <span className="text-[12px] font-semibold text-gray-900">
            Signature Glow Facial
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">Date</span>
          <span className="text-[12px] font-semibold text-gray-900">
            Wed, Apr 17 · 2:30 PM
          </span>
        </div>
        <div className="h-px bg-gray-200" />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">Total</span>
          <span className="text-[14px] font-bold text-gray-900 tabular-nums">
            ₦45,000
          </span>
        </div>
      </div>

      <div className="mt-auto">
        <FakeCta label="Continue to Checkout" />
      </div>
    </div>
  )
}

/* ---------- Stage 3: confirmation ---------- */
/* Flat check badge, no concentric rings. Clean receipt card below.  */
function ConfirmedStage() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7B2D8E]">
        <Check className="h-7 w-7 text-white" strokeWidth={3} />
      </div>
      <h4 className="mt-5 text-[16px] font-bold text-gray-900 tracking-tight">
        You&apos;re all set
      </h4>
      <p className="mt-1 text-[11px] text-gray-500 leading-relaxed max-w-[220px]">
        We&apos;ve sent a confirmation to your email.
      </p>

      <div className="mt-5 w-full rounded-xl border border-gray-200 bg-white p-4 text-left space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">
            Treatment
          </span>
          <span className="text-[12px] font-semibold text-gray-900">
            Signature Glow Facial
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">When</span>
          <span className="text-[12px] font-semibold text-gray-900">
            Wed, Apr 17 · 2:30 PM
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">
            Reference
          </span>
          <span className="text-[12px] font-semibold text-gray-900 font-mono">
            DS-26-00017
          </span>
        </div>
      </div>
    </div>
  )
}

/* ---------- In-screen CTA ---------- */
function FakeCta({ label }: { label: string }) {
  return (
    <div className="w-full py-3 rounded-xl text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 bg-[#7B2D8E]">
      {label}
      <ArrowRight className="w-3.5 h-3.5" />
    </div>
  )
}
