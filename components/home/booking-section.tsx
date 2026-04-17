'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  ArrowRight,
  Phone,
  Check,
  Gift,
  RefreshCw,
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

// A realistic week strip for the mockup — "Wed 17" is the selected day.
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

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 120)
    return () => clearTimeout(t)
  }, [])

  return (
    // Standard home-section rhythm: 48px mobile, 64px desktop.
    <section className="py-12 md:py-16 bg-[#F8F2FB] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments, purchase gift vouchers, and manage your visits — all from your phone."
        />

        {/* Main two-column layout: phone mockup + feature list / CTAs */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center transition-all duration-700 ${
            animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* ---------- PHONE MOCKUP ---------- */}
          <div className="relative flex justify-center lg:justify-start">
            {/* Soft decorative blur behind the phone */}
            <div
              aria-hidden
              className="absolute inset-0 -z-0 flex items-center justify-center"
            >
              <div
                className="w-[280px] h-[280px] md:w-[340px] md:h-[340px] rounded-full blur-3xl opacity-40"
                style={{ backgroundColor: BRAND }}
              />
            </div>

            <PhoneMockup />
          </div>

          {/* ---------- FEATURES + CTAs ---------- */}
          <div className="space-y-6">
            <ul className="space-y-3">
              {FEATURES.map((f) => (
                <li
                  key={f.title}
                  className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-sm transition-all"
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

            {/* CTAs — horizontal on all sizes, wrap if needed */}
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="tel:+2349017972919"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-[#6B2278] transition-colors"
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
/* Phone mockup — single, readable, realistic booking screen.         */
/* Sized once here (not responsive widths) so everything inside stays */
/* pixel-crisp and legible instead of shrinking text to 4–6px.        */
/* ------------------------------------------------------------------ */
function PhoneMockup() {
  return (
    <div className="relative z-10 w-[260px] md:w-[290px]">
      {/* Outer device frame */}
      <div
        className="rounded-[40px] p-2.5 shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, #1a1a1a 0%, #2a2a2a 100%)',
          boxShadow: '0 30px 60px -20px rgba(123, 45, 142, 0.35), 0 20px 40px -20px rgba(0,0,0,0.2)',
        }}
      >
        {/* Screen */}
        <div className="relative bg-white rounded-[32px] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-1.5 text-[10px] font-semibold text-gray-900">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              {/* signal */}
              <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
                <rect x="0" y="7" width="2" height="3" rx="0.5" />
                <rect x="3" y="5" width="2" height="5" rx="0.5" />
                <rect x="6" y="3" width="2" height="7" rx="0.5" />
                <rect x="9" y="1" width="2" height="9" rx="0.5" />
              </svg>
              {/* battery */}
              <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
                <rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="currentColor" />
                <rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor" />
                <rect x="19.5" y="3" width="1.5" height="4" rx="0.5" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Notch / dynamic-island bar */}
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
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[#7B2D8E]" />
            </div>
          </div>

          {/* Selected treatment card */}
          <div className="mx-4 mb-3 rounded-xl bg-[#7B2D8E] text-white p-3 shadow-md shadow-[#7B2D8E]/20 relative overflow-hidden">
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

          {/* Date picker */}
          <div className="px-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-gray-900">April 2026</p>
              <span className="text-[9px] text-[#7B2D8E] font-semibold">
                View all
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {DAYS.map((d) => (
                <div
                  key={d.n}
                  className={`flex flex-col items-center justify-center py-1.5 rounded-lg ${
                    d.selected
                      ? 'bg-[#7B2D8E] text-white shadow-sm shadow-[#7B2D8E]/30'
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
                  <span className="text-xs font-bold leading-none mt-0.5">
                    {d.n}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div className="px-4 mb-3">
            <p className="text-[11px] font-bold text-gray-900 mb-2">
              Available times
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {TIME_SLOTS.map((s) => {
                const base =
                  'text-[10px] font-semibold py-1.5 rounded-lg text-center border'
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
          </div>

          {/* Continue button */}
          <div className="px-4 pb-5">
            <div className="w-full py-3 rounded-xl bg-[#7B2D8E] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#7B2D8E]/25">
              Continue to Checkout
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center justify-center mt-3">
              <div className="w-24 h-1 bg-gray-900 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating "confirmed" chip — adds life/depth */}
      <div className="hidden sm:flex absolute -left-6 top-1/3 bg-white rounded-xl shadow-lg p-2.5 items-center gap-2 border border-gray-100 rotate-[-4deg]">
        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
          <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-900 leading-none">
            Booking confirmed
          </p>
          <p className="text-[9px] text-gray-500 mt-0.5 leading-none">
            Wed, Apr 17 · 2:30 PM
          </p>
        </div>
      </div>
    </div>
  )
}
