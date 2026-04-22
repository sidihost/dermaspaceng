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
  { icon: Calendar, title: 'Book at 2am if you want', desc: 'No more waiting for the shop to open' },
  { icon: Clock, title: 'See real availability', desc: 'Not placeholder slots — actual live openings' },
  { icon: Gift, title: 'Send a gift voucher', desc: 'Straight to their phone, no wrapping paper' },
  { icon: RefreshCw, title: 'Change your mind? Fine', desc: 'Reschedule or cancel with two taps' },
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
const STAGE_DURATION_MS = 3800

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
          title="Booking, but"
          highlight="on your phone"
          description="We\u2019re finishing up online booking. When it lands, you\u2019ll pick a treatment, see real slots, pay, and be done — all without picking up the phone."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="flex justify-center lg:justify-start">
            <AppPreview stage={stage} />
          </div>

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
              Want first dibs when it launches?{' '}
              <span className="font-semibold text-[#7B2D8E]">
                WhatsApp us
              </span>{' '}
              — we&apos;ll ping you the day it goes live.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* App Preview                                                        */
/*                                                                    */
/* Redesign notes:                                                    */
/*  - No gradients anywhere (no halo blur, no gradient bezel, no      */
/*    gradient shadows).                                              */
/*  - Dropped the iPhone gimmicks (dynamic island, status bar, home   */
/*    indicator, curved 46px bezel) which were fighting the content   */
/*    and making the mockup feel toy-like.                            */
/*  - Replaced with a plain white product card on a light bg with     */
/*    a single soft drop shadow and a hairline border. Matches the    */
/*    "product UI screenshot" language Linear / Vercel / Cal.com use  */
/*    on their landing pages.                                         */
/*  - Bigger surface (max-w-sm) and larger typography inside so the   */
/*    content reads clearly instead of squinting at 9-11px text.      */
/* ------------------------------------------------------------------ */
function AppPreview({ stage }: { stage: Stage }) {
  return (
    <div className="w-full max-w-sm">
      <div
        className="rounded-2xl bg-white border border-gray-200 overflow-hidden"
        style={{ boxShadow: '0 20px 40px -20px rgba(17, 17, 17, 0.15)' }}
      >
        {/* Top bar — minimal app chrome. Logo chip + app title on the
            left, a mock "window controls" dot on the right to hint at
            this being a product surface without screaming "iPhone". */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#F8F2FB] flex items-center justify-center">
              <Image
                src="/images/dermaspace-logo.png"
                alt="Dermaspace"
                width={16}
                height={16}
                className="object-contain"
              />
            </div>
            <p className="text-sm font-bold text-gray-900 tracking-tight">
              Book Appointment
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
          </div>
        </div>

        {/* Stage body */}
        <div className="relative h-[420px] px-5 py-5">
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
      </div>

      {/* Stage indicator */}
      <div
        className="mt-4 flex items-center justify-center gap-1.5"
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
      className={`absolute inset-0 px-5 py-5 transition-opacity duration-500 ease-out ${
        active ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}

/* ---------- Stage 1 ---------- */
function TreatmentStage() {
  return (
    <div className="flex h-full flex-col">
      {/* Flat brand surface, no gradient. */}
      <div className="rounded-xl bg-[#7B2D8E] text-white p-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/70 font-semibold">
          Selected Treatment
        </p>
        <h4 className="text-lg font-bold mt-1.5 leading-tight tracking-tight">
          Signature Glow Facial
        </h4>
        <div className="mt-4 flex items-end justify-between">
          <div className="flex items-center gap-2.5 text-xs text-white/80">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              60 min
            </span>
            <span className="text-white/30">•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Victoria Island
            </span>
          </div>
          <span className="text-lg font-bold tabular-nums leading-none">
            ₦45,000
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-bold text-gray-900">April 2026</p>
          <p className="text-xs text-gray-400 font-medium">This week</p>
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
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  d.selected ? 'text-white/70' : 'text-gray-400'
                }`}
              >
                {d.d}
              </span>
              <span className="text-sm font-bold leading-none mt-1 tabular-nums">
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

/* ---------- Stage 2 ---------- */
function SlotStage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900">Available times</p>
        <p className="text-xs text-gray-400 font-medium">Wed, Apr 17</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TIME_SLOTS.map((s) => {
          const base =
            'text-xs font-semibold py-3 rounded-lg text-center tabular-nums'
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
          <span className="text-xs text-gray-500 font-medium">Treatment</span>
          <span className="text-xs font-semibold text-gray-900">
            Signature Glow Facial
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">Date</span>
          <span className="text-xs font-semibold text-gray-900">
            Wed, Apr 17 · 2:30 PM
          </span>
        </div>
        <div className="h-px bg-gray-200" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">Total</span>
          <span className="text-sm font-bold text-gray-900 tabular-nums">
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

/* ---------- Stage 3 ---------- */
function ConfirmedStage() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      {/* Flat brand circle, no rings, no gradient. */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7B2D8E]">
        <Check className="h-7 w-7 text-white" strokeWidth={3} />
      </div>
      <h4 className="mt-5 text-base font-bold text-gray-900 tracking-tight">
        You&apos;re all set
      </h4>
      <p className="mt-1 text-xs text-gray-500 leading-relaxed max-w-[240px]">
        We&apos;ve sent a confirmation to your email.
      </p>

      <div className="mt-5 w-full rounded-xl border border-gray-200 bg-white p-4 text-left space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">Treatment</span>
          <span className="text-xs font-semibold text-gray-900">
            Signature Glow Facial
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">When</span>
          <span className="text-xs font-semibold text-gray-900">
            Wed, Apr 17 · 2:30 PM
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">Reference</span>
          <span className="text-xs font-semibold text-gray-900 font-mono">
            DS-26-00017
          </span>
        </div>
      </div>
    </div>
  )
}

function FakeCta({ label }: { label: string }) {
  return (
    <div className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 bg-[#7B2D8E]">
      {label}
      <ArrowRight className="w-4 h-4" />
    </div>
  )
}
