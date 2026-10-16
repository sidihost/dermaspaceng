'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Star } from 'lucide-react'

const HeroScene = dynamic(() => import('./hero-scene'), { ssr: false })

const SLIDE_MS = 6000

const slides = [
  {
    image: '/images/hero-1.jpg',
    alt: 'Therapist giving a client a calming facial treatment',
    eyebrow: 'Skin Care',
    title: 'Skin that feels',
    highlight: 'like yours',
    description:
      'Facials, peels and treatments for Lagos weather and Lagos skin. No gimmicks, just results you can see.',
  },
  {
    image: '/images/hero-2.jpg',
    alt: 'Client relaxing during a full body massage',
    eyebrow: 'Body & Spa',
    title: 'An afternoon',
    highlight: 'off your shoulders',
    description: 'Massages, scrubs and steam in a quiet room. You walk out lighter than you walked in.',
  },
  {
    image: '/images/hero-3.jpg',
    alt: 'Dermaspace therapist consulting with a client about her skin',
    eyebrow: 'Therapy',
    title: 'A therapist who',
    highlight: 'knows your skin',
    description: 'We listen first, recommend second, and build a plan that fits your life.',
  },
]

const stats = [
  { value: '5K+', label: 'Happy clients' },
  { value: '4.9', label: 'Average rating' },
  { value: '2', label: 'Lagos studios' },
]

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

export default function Hero() {
  const reducedMotion = usePrefersReducedMotion()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((i: number) => setCurrent((i + slides.length) % slides.length), [])
  const next = useCallback(() => setCurrent((i) => (i + 1) % slides.length), [])
  const prev = useCallback(() => setCurrent((i) => (i - 1 + slides.length) % slides.length), [])

  useEffect(() => {
    if (reducedMotion || paused) return
    const id = window.setTimeout(next, SLIDE_MS)
    return () => window.clearTimeout(id)
  }, [current, paused, reducedMotion, next])

  const active = slides[current]

  const scrollToBooking = () => {
    const section = document.getElementById('booking-section')
    if (section) section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
    else window.location.href = '/booking'
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Dermaspace highlights"
      className="relative overflow-hidden bg-[#FAF6FB]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-24 h-[440px] w-[440px] rounded-full border border-[#7B2D8E]/10 sm:h-[560px] sm:w-[560px] lg:right-[-8%] lg:top-1/2 lg:h-[700px] lg:w-[700px] lg:-translate-y-1/2"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-4 pb-6 pt-8 sm:px-6 sm:pt-12 lg:min-h-[600px] lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8 lg:py-14">
        <div className="relative z-10 flex flex-col" aria-live="polite">
          <div key={`eyebrow-${current}`} className="hero-word mb-5 flex items-center gap-3">
            <span className="h-px w-8 bg-[#7B2D8E]" aria-hidden="true" />
            <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#7B2D8E] sm:text-xs">
              {active.eyebrow}
            </span>
          </div>

          <h1 className="text-balance font-sans text-[2.4rem] font-semibold leading-[1.04] tracking-tight text-[#2A0C3A] sm:text-6xl lg:text-[4.25rem]">
            <span key={`title-${current}`} className="hero-word block">
              {active.title}
            </span>
            <span
              key={`hl-${current}`}
              className="hero-word block font-serif font-normal italic text-[#7B2D8E]"
              style={{ animationDelay: '90ms' }}
            >
              {active.highlight}
              <span className="text-[#E3B26B]">.</span>
            </span>
          </h1>

          <p
            key={`desc-${current}`}
            className="hero-word mt-5 min-h-[3.5rem] max-w-md text-pretty text-base leading-relaxed text-[#2A0C3A]/70 sm:text-lg"
            style={{ animationDelay: '160ms' }}
          >
            {active.description}
          </p>

          <div className="hero-rise mt-7 flex flex-wrap items-center gap-3" style={{ animationDelay: '240ms' }}>
            <button
              type="button"
              onClick={scrollToBooking}
              className="group inline-flex items-center gap-3 rounded-full bg-[#7B2D8E] py-2 pl-6 pr-2 text-sm font-semibold text-white transition-colors hover:bg-[#6A2579] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E] focus-visible:ring-offset-2"
            >
              Book appointment
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#7B2D8E] transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
            <Link
              href="/services"
              className="group inline-flex items-center gap-1.5 rounded-full border border-[#2A0C3A]/15 bg-white px-5 py-3 text-sm font-semibold text-[#2A0C3A] transition-colors hover:border-[#7B2D8E] hover:text-[#7B2D8E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E] focus-visible:ring-offset-2"
            >
              Explore services
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          <dl
            className="hero-rise mt-9 hidden max-w-md grid-cols-3 divide-x divide-[#2A0C3A]/10 border-t border-[#2A0C3A]/10 pt-5 sm:grid"
            style={{ animationDelay: '320ms' }}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1 px-3 first:pl-0">
                <dt className="order-2 text-xs leading-tight text-[#2A0C3A]/55">{s.label}</dt>
                <dd className="order-1 flex items-center gap-1 font-serif text-3xl font-semibold text-[#2A0C3A]">
                  {s.value}
                  {s.value === '4.9' ? <Star className="h-4 w-4 fill-[#E3B26B] text-[#E3B26B]" aria-hidden="true" /> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative h-[360px] sm:h-[480px] lg:h-[560px]">
          <div className="absolute inset-y-0 right-0 w-[68%] overflow-hidden rounded-t-full rounded-b-[2rem] border border-[#7B2D8E]/15 bg-[#EADCF0] sm:w-[62%]">
            {slides.map((slide, i) => (
              <Image
                key={slide.image}
                src={slide.image}
                alt={i === current ? slide.alt : ''}
                aria-hidden={i !== current}
                fill
                sizes="(min-width: 1024px) 380px, 60vw"
                priority={i === 0}
                className={`object-cover transition-[opacity,transform] duration-[1200ms] ease-out ${
                  i === current ? 'scale-100 opacity-100' : 'scale-110 opacity-0'
                }`}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0 lg:-left-10">
            <HeroScene reducedMotion={reducedMotion} />
          </div>
        </div>
      </div>

      <div className="relative border-t border-[#2A0C3A]/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl font-semibold tabular-nums text-[#7B2D8E]">
              {String(current + 1).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose slide">
              {slides.map((s, i) => (
                <button
                  key={s.eyebrow}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`Slide ${i + 1}: ${s.eyebrow}`}
                  onClick={() => goTo(i)}
                  className={`relative h-[3px] overflow-hidden rounded-full bg-[#2A0C3A]/10 transition-all duration-500 ${
                    i === current ? 'w-14 sm:w-20' : 'w-5 hover:bg-[#2A0C3A]/25'
                  }`}
                >
                  {i === current ? (
                    <span
                      key={`fill-${current}`}
                      className="hero-progress absolute inset-y-0 left-0 bg-[#7B2D8E]"
                      style={{
                        animationDuration: `${SLIDE_MS}ms`,
                        animationPlayState: paused || reducedMotion ? 'paused' : 'running',
                      }}
                    />
                  ) : null}
                </button>
              ))}
            </div>
            <span className="text-xs font-medium tabular-nums text-[#2A0C3A]/40">
              / {String(slides.length).padStart(2, '0')}
            </span>
          </div>

          <p className="hidden items-center gap-2 md:flex">
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#2A0C3A]/40">Now showing</span>
            <span className="text-sm font-medium text-[#2A0C3A]">{active.eyebrow}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2A0C3A]/15 text-[#2A0C3A]/70 transition-colors hover:border-[#7B2D8E] hover:text-[#7B2D8E]"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7B2D8E] text-white transition-colors hover:bg-[#6A2579]"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
