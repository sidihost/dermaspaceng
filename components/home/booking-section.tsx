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
const STAGE_DURATION_MS = 2600

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
/* Phone mockup — compact auto-playing demo.                          */
/* Flat on the lilac background: no device drop-shadow, no floating   */
/* chips. Each stage fades in like a short looping screencast.        */
/* ------------------------------------------------------------------ */
function PhoneMockup({ stage }: { stage: Stage }) {
  return (
    <div className="relative w-[240px] md:w-[260px]">
      {/* Outer device frame — flat, just a thin bezel so it still reads
          as a device on the lilac background. No drop-shadow. */}
      <div className="rounded-[36px] p-2 bg-gray-900 ring-1 ring-black/10">
        {/* Screen */}
        <div className="relative bg-white rounded-[28px] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-2.5 pb-1 text-[10px] font-semibold text-gray-900">
            <span>9:41</span>
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

          {/* Notch */}
          <div className="flex justify-center pb-2">
            <div className="w-20 h-5 bg-black rounded-full" />
          </div>

          {/* App header */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F8F2FB] flex items-center justify-center border border-[#7B2D8E]/10">
                <Image
                  src="/images/dermaspace-logo.png"
                  alt="Dermaspace"
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold leading-none">
                  Book
                </p>
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  Appointment
                </p>
              </div>
            </div>
            {/* Replaced the Sparkles icon with a simple notification bell dot
                — feels more like a real app header than a gimmicky sparkle. */}
            <div className="relative w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <CalendarCheck className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#7B2D8E] rounded-full ring-2 ring-white" />
            </div>
          </div>

          {/* Animated body — fixed height so the card doesn't jump between
              stages. Each stage absolutely fills this area and cross-fades. */}
          <div className="relative h-[340px] px-4 pb-4">
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
            <div className="w-24 h-1 bg-gray-900 rounded-full" />
          </div>
        </div>
      </div>

      {/* Stage indicator — tiny dots + "Live demo" label, sitting on the
          section background (not on the device), so the card reads as an
          auto-playing preview rather than a static screenshot. */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7B2D8E] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7B2D8E]" />
        </span>
        <span className="text-xs font-medium text-gray-600">Live demo</span>
        <span className="ml-1 flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === stage ? 'w-4 bg-[#7B2D8E]' : 'w-1.5 bg-[#7B2D8E]/25'
              }`}
            />
          ))}
        </span>
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
      className={`absolute inset-0 px-4 pb-4 transition-opacity duration-500 ease-out ${
        active ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}

/* ---------- Stage 1: selected treatment + (placeholder) date picker ---------- */
function TreatmentStage() {
  return (
    <div className="flex h-full flex-col">
      {/* Selected treatment card */}
      <div className="rounded-xl bg-[#7B2D8E] text-white p-3 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/10"
        />
        <p className="text-[9px] uppercase tracking-wider text-white/70 font-semibold">
          Selected Treatment
        </p>
        <h4 className="text-sm font-bold mt-0.5">Signature Glow Facial</h4>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-white/80">
            <Clock className="w-3 h-3" />
            <span>60 min</span>
          </div>
          <span className="text-sm font-bold">₦45,000</span>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-bold text-gray-900 mb-2">April 2026</p>
        <div className="grid grid-cols-6 gap-1.5">
          {DAYS.map((d) => (
            <div
              key={d.n}
              className={`flex flex-col items-center justify-center py-1.5 rounded-lg ${
                d.selected
                  ? 'bg-[#7B2D8E] text-white'
                  : 'bg-gray-50 text-gray-700 border border-gray-100'
              }`}
            >
              <span
                className={`text-[8px] font-semibold ${
                  d.selected ? 'text-white/80' : 'text-gray-400'
                }`}
              >
                {d.d}
              </span>
              <span className="text-xs font-bold leading-none mt-0.5">{d.n}</span>
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
      <p className="text-[11px] font-bold text-gray-900 mb-2">
        Available times · Wed, Apr 17
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {TIME_SLOTS.map((s) => {
          const base =
            'text-[10px] font-semibold py-2 rounded-lg text-center border'
          if (s.state === 'selected') {
            return (
              <div
                key={s.time}
                className={`${base} bg-[#7B2D8E] text-white border-[#7B2D8E] flex items-center justify-center gap-1`}
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

      <div className="mt-3 rounded-xl border border-gray-100 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#7B2D8E]" />
            <span className="text-[11px] font-semibold text-gray-900">
              Signature Glow Facial
            </span>
          </div>
          <span className="text-[11px] font-bold text-gray-900">₦45,000</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-[#7B2D8E]" />
            <span className="text-[11px] text-gray-600">
              Wed, Apr 17 · 2:30 PM
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <CreditCard className="h-3 w-3" />
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
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
        <Check className="h-8 w-8 text-green-600" strokeWidth={3} />
      </div>
      <h4 className="mt-3 text-sm font-bold text-gray-900">
        Booking confirmed
      </h4>
      <p className="mt-1 text-[11px] text-gray-500">
        Wed, Apr 17 · 2:30 PM
      </p>

      <div className="mt-4 w-full rounded-xl border border-gray-100 p-3 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-900">
            Signature Glow Facial
          </span>
          <span className="text-[11px] font-bold text-gray-900">₦45,000</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500">
          <span>Victoria Island</span>
          <span>60 min</span>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-gray-400">
        Reference DS-2026-00017
      </p>
    </div>
  )
}

/* ---------- In-screen CTA (flat, no shadow) ---------- */
function FakeCta({ label }: { label: string }) {
  return (
    <div className="w-full py-2.5 rounded-xl bg-[#7B2D8E] text-white text-[11px] font-bold flex items-center justify-center gap-1.5">
      {label}
      <ArrowRight className="w-3 h-3" />
    </div>
  )
}
