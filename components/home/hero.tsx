'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Award, CalendarDays, Sparkles, Star } from 'lucide-react'

const trustStats = [
  { label: 'Happy Clients', value: '5K+' },
  { label: 'Years Experience', value: '7+' },
  { label: 'Locations', value: '2' },
]

export default function Hero() {
  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#FDFBF9] pb-16 pt-10 md:pb-20 md:pt-14">
      <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-[#7B2D8E]/10 blur-3xl" />
      <div className="absolute -right-14 top-28 h-64 w-64 rounded-full bg-[#7B2D8E]/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7B2D8E]/20 bg-white px-4 py-2 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7B2D8E]">
              <Award className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-sm font-medium text-gray-700">Lagos No.1 Spa & Wellness Center</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
            Your Journey to <span className="text-[#7B2D8E]">Skin Confidence</span>
            <span className="mt-1 block">Starts Here</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600 md:text-lg">
            Relax, restore, and glow with personalized facials, body therapies, and wellness experiences designed
            around your skin goals.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={scrollToBooking}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#5A1D6A]"
            >
              Book Appointment
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-7 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#7B2D8E] hover:text-[#7B2D8E]"
            >
              Explore Services
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-100">
              <Sparkles className="h-3.5 w-3.5 text-[#7B2D8E]" /> Personalized Plans
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-100">
              <CalendarDays className="h-3.5 w-3.5 text-[#7B2D8E]" /> Same-week Booking
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-100">
              <Star className="h-3.5 w-3.5 fill-[#7B2D8E] text-[#7B2D8E]" /> 4.9 Client Rating
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-[#7B2D8E]/20 via-transparent to-[#7B2D8E]/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white p-3 shadow-2xl">
            <div className="relative overflow-hidden rounded-[1.4rem]">
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                alt="Spa facial treatment"
                width={900}
                height={620}
                className="h-full w-full object-cover"
                priority
              />

              <div className="absolute bottom-4 left-4 z-20 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-wide text-[#7B2D8E]">Today&apos;s Spotlight</p>
                <p className="text-sm font-semibold text-gray-900">Advanced Hydrating Facial</p>
              </div>

              <div className="absolute right-4 top-4 z-20 rounded-2xl bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
                <p className="text-xs text-gray-500">Client Satisfaction</p>
                <p className="text-base font-bold text-gray-900">98%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto mt-10 grid max-w-6xl gap-3 px-4 sm:grid-cols-3">
        {trustStats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#7B2D8E]/10 bg-white px-4 py-4 text-center shadow-sm"
          >
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
