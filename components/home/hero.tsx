'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Sparkles, Star } from 'lucide-react'

const slides = [
  {
    image: '/images/hero-1.jpg',
    eyebrow: 'Skin Care',
    title: 'Skin that feels',
    highlight: 'like yours',
    description:
      'Facials, peels and treatments for Lagos weather and Lagos skin. No gimmicks, just results you can see.',
  },
  {
    image: '/images/hero-2.jpg',
    eyebrow: 'Body & Spa',
    title: 'An afternoon',
    highlight: 'off your shoulders',
    description:
      'Massages, scrubs and steam in a quiet room. You walk out lighter than you walked in.',
  },
  {
    image: '/images/hero-3.jpg',
    eyebrow: 'Therapy',
    title: 'A therapist who',
    highlight: 'knows your skin',
    description:
      'We listen first, recommend second, and build a plan that fits your life.',
  },
]

const SLIDE_DURATION_MS = 6000
const PROGRESS_TICK_MS = 100

/**
 * Splits a string into animated characters.
 * Each character is wrapped in a span with a staggered reveal delay.
 * Spaces keep their width so the mask reveals cleanly per letter.
 */
function AnimatedText({
  text,
  baseDelay = 0,
  step = 28,
  italic = false,
  className = '',
}: {
  text: string
  baseDelay?: number
  step?: number
  italic?: boolean
  className?: string
}) {
  return (
    <span className={`inline-block ${className}`} aria-label={text}>
      {text.split('').map((char, i) => (
        <span
          key={`${char}-${i}`}
          aria-hidden="true"
          className="inline-block overflow-hidden align-baseline"
          style={{
            // Mask wrapper — the inner span slides up from below
            height: '1.05em',
            lineHeight: '1.05em',
          }}
        >
          <span
            className={`inline-block ${italic ? 'italic' : ''}`}
            style={{
              animation: `hero-char-in 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both`,
              animationDelay: `${baseDelay + i * step}ms`,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        </span>
      ))}
    </span>
  )
}

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [progress, setProgress] = useState(0)

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning || index === currentSlide) return
      setIsTransitioning(true)
      setCurrentSlide(index)
      setProgress(0)
      setTimeout(() => setIsTransitioning(false), 600)
    },
    [isTransitioning, currentSlide],
  )

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length)
  }, [currentSlide, goToSlide])

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length)
  }, [currentSlide, goToSlide])

  useEffect(() => {
    const increment = (PROGRESS_TICK_MS / SLIDE_DURATION_MS) * 100
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide()
          return 0
        }
        return prev + increment
      })
    }, PROGRESS_TICK_MS)
    return () => clearInterval(progressInterval)
  }, [nextSlide])

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const active = slides[currentSlide]
  const upNext = [1, 2].map((offset) => (currentSlide + offset) % slides.length)

  // Duration to finish the character stagger before drawing the underline
  const titleStepMs = 28
  const highlightDelay = active.title.length * titleStepMs + 180
  const underlineDelay = highlightDelay + active.highlight.length * titleStepMs + 120

  return (
    <section
      className="relative isolate overflow-hidden bg-[#2A0C3A] h-[calc(100svh-7.25rem)] min-h-[600px] max-h-[840px] sm:min-h-[640px] lg:min-h-[700px]"
      aria-roledescription="carousel"
      aria-label="Featured treatments"
    >
      {/* Background slider */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={slide.image}
            className={`absolute inset-0 transition-opacity duration-[1100ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={index !== currentSlide}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              sizes="100vw"
              className={`object-cover object-[65%_center] sm:object-center transition-transform ease-out ${
                index === currentSlide ? 'scale-100' : 'scale-110'
              }`}
              style={{ transitionDuration: `${SLIDE_DURATION_MS + 1200}ms` }}
              priority={index === 0}
            />
          </div>
        ))}

        {/* Cinematic plum overlays — brand-tinted (#2A0C3A) rather than
            neutral black so the hero reads as Dermaspace at a glance while
            keeping white copy legible over bright photography. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(42,12,58,0.82) 0%, rgba(42,12,58,0.55) 38%, rgba(42,12,58,0.18) 68%, rgba(42,12,58,0.05) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[62%]"
          style={{
            background:
              'linear-gradient(180deg, rgba(42,12,58,0) 0%, rgba(42,12,58,0.55) 55%, rgba(42,12,58,0.92) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32"
          style={{
            background:
              'linear-gradient(180deg, rgba(42,12,58,0.45) 0%, rgba(42,12,58,0) 100%)',
          }}
        />
        {/* Purple spotlight behind the headline column */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(55% 70% at 18% 62%, rgba(123,45,142,0.38) 0%, transparent 65%)',
          }}
        />
        {/* Fine grain keeps flat gradients from banding on large screens */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Rising steam wisps */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-0 w-1/2 h-full pointer-events-none overflow-hidden"
      >
        {[
          { left: '18%', delay: '0s', dur: '9s', size: 180, opacity: 0.09 },
          { left: '42%', delay: '2.2s', dur: '11s', size: 220, opacity: 0.08 },
          { left: '68%', delay: '4.6s', dur: '10s', size: 160, opacity: 0.07 },
          { left: '85%', delay: '6.8s', dur: '12s', size: 200, opacity: 0.06 },
        ].map((s, i) => (
          <span
            key={i}
            className="absolute bottom-[-40px] rounded-full blur-2xl"
            style={{
              left: s.left,
              width: s.size,
              height: s.size,
              background: `radial-gradient(circle, rgba(255,255,255,${s.opacity + 0.1}) 0%, rgba(255,255,255,${s.opacity}) 40%, transparent 70%)`,
              animation: `hero-steam ${s.dur} ease-out ${s.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Drifting petals */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { top: '-6%', left: '12%', delay: '0s', dur: '16s', size: 11 },
          { top: '-8%', left: '28%', delay: '3.5s', dur: '20s', size: 9 },
          { top: '-10%', left: '46%', delay: '1.2s', dur: '22s', size: 12 },
          { top: '-6%', left: '62%', delay: '7s', dur: '18s', size: 9 },
          { top: '-10%', left: '78%', delay: '4.2s', dur: '24s', size: 10 },
          { top: '-8%', left: '90%', delay: '10s', dur: '19s', size: 11 },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute block"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size * 1.4,
              animation: `hero-petal ${p.dur} linear ${p.delay} infinite`,
              filter:
                'drop-shadow(0 0 5px rgba(255,255,255,0.55)) drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
            }}
          >
            <svg viewBox="0 0 10 14" className="w-full h-full">
              <path d="M5 0 C8 3, 9 8, 5 14 C1 8, 2 3, 5 0 Z" fill="rgba(200, 150, 215, 0.85)" />
            </svg>
          </span>
        ))}
      </div>

      {/* Left-edge vertical wordmark (desktop) */}
      <div
        aria-hidden="true"
        className="hidden xl:flex absolute left-6 top-0 bottom-28 items-center pointer-events-none"
      >
        <span
          className="text-[10px] font-medium uppercase tracking-[0.5em] text-white/45 whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Dermaspace · Estd. 2014
        </span>
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">
        <div className="flex-1 flex items-end pb-24 sm:pb-28 lg:pb-32 pt-10">
          <div className="w-full grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-10 items-end">
            {/* Copy */}
            <div className="max-w-2xl">
              {/* Eyebrow */}
              <div
                key={`eyebrow-${currentSlide}`}
                className="mb-4 sm:mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md pl-1.5 pr-3.5 py-1.5"
                style={{ animation: 'hero-char-in 520ms ease-out both' }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7B2D8E] text-white">
                  <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
                  {active.eyebrow}
                </span>
              </div>

              {/* Title */}
              <div key={`title-${currentSlide}`} className="mb-4 sm:mb-5">
                <h1 className="font-sans text-[2.5rem] leading-[1.02] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-semibold text-white tracking-tight text-balance">
                  <AnimatedText text={active.title} baseDelay={0} step={titleStepMs} />
                  <br />
                  <span
                    className="relative inline-block pb-3 sm:pb-4"
                    style={{ textShadow: '0 2px 24px rgba(42,12,58,0.5)' }}
                  >
                    <span className="font-serif italic font-normal text-white">
                      <AnimatedText
                        text={active.highlight}
                        baseDelay={highlightDelay}
                        step={titleStepMs}
                        italic
                      />
                      <span
                        className="text-[#C88AD6] inline-block"
                        style={{
                          animation: `hero-char-in 500ms ease-out ${underlineDelay}ms both`,
                        }}
                      >
                        .
                      </span>
                    </span>

                    {/* Hand-drawn underline */}
                    <svg
                      aria-hidden="true"
                      className="absolute left-0 bottom-0 w-full h-3 pointer-events-none"
                      viewBox="0 0 240 12"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M2 8 C 40 2, 90 12, 130 5 S 210 2, 238 7"
                        fill="none"
                        stroke="#C88AD6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="240"
                        style={{
                          animation: `hero-draw 900ms cubic-bezier(0.22, 1, 0.36, 1) ${underlineDelay}ms both`,
                        }}
                      />
                    </svg>
                  </span>
                </h1>
              </div>

              {/* Description */}
              <div key={`desc-${currentSlide}`} className="mb-6 sm:mb-7 min-h-[48px]">
                <p
                  className="text-[15px] sm:text-lg text-white/80 max-w-md leading-relaxed"
                  style={{
                    animation: `hero-char-in 700ms ease-out ${underlineDelay + 150}ms both`,
                  }}
                >
                  {active.description}
                </p>
              </div>

              {/* CTAs */}
              <div
                key={`cta-${currentSlide}`}
                className="flex flex-wrap items-center gap-3 mb-6 sm:mb-8"
                style={{
                  animation: `hero-char-in 700ms ease-out ${underlineDelay + 280}ms both`,
                }}
              >
                <button
                  onClick={scrollToBooking}
                  className="group relative overflow-hidden inline-flex items-center gap-3 pl-6 pr-1.5 py-1.5 bg-white text-[#7B2D8E] text-sm font-semibold rounded-full transition-all duration-300 shadow-[0_12px_40px_-12px_rgba(42,12,58,0.7)] hover:shadow-[0_18px_48px_-12px_rgba(42,12,58,0.8)] hover:-translate-y-0.5"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 -left-3/4 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-[#7B2D8E]/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[260%]"
                  />
                  <span className="relative">Book Appointment</span>
                  <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[#7B2D8E] text-white transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-6 py-3 text-white text-sm font-semibold rounded-full border border-white/30 bg-white/5 backdrop-blur-md hover:bg-white/15 hover:border-white/50 transition-all duration-300"
                >
                  View Services
                </Link>
              </div>

              {/* Trust row */}
              <div
                key={`trust-${currentSlide}`}
                className="flex flex-wrap items-center gap-x-5 gap-y-3"
                style={{
                  animation: `hero-char-in 700ms ease-out ${underlineDelay + 400}ms both`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex -space-x-2.5">
                    {['/images/client-1.jpg', '/images/client-2.jpg', '/images/client-3.jpg'].map(
                      (src) => (
                        <div
                          key={src}
                          className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#2A0C3A]/60 outline outline-1 outline-white/40"
                        >
                          <Image
                            src={src}
                            alt=""
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ),
                    )}
                    <div className="w-8 h-8 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-[#2A0C3A]/60 outline outline-1 outline-white/40">
                      5K+
                    </div>
                  </div>
                  <div className="leading-tight">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-[#F2C94C] fill-[#F2C94C]" />
                      ))}
                      <span className="ml-1.5 text-xs font-semibold text-white">4.9</span>
                    </div>
                    <p className="text-[11px] text-white/70">from 5,000+ happy clients</p>
                  </div>
                </div>

                <span aria-hidden="true" className="hidden sm:block h-6 w-px bg-white/20" />

                <div className="hidden sm:flex items-center gap-2 text-white/80">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/15">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-medium">2 locations in Lagos</span>
                </div>
              </div>
            </div>

            {/* Up next — desktop only */}
            <div className="hidden lg:flex flex-col items-end gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
                Up next
              </span>
              <div className="flex gap-3">
                {upNext.map((index) => {
                  const slide = slides[index]
                  return (
                    <button
                      key={slide.image}
                      type="button"
                      onClick={() => goToSlide(index)}
                      className="group relative w-[172px] h-[112px] rounded-2xl overflow-hidden ring-1 ring-white/25 hover:ring-white/60 transition-all duration-300 hover:-translate-y-1 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)] text-left"
                      aria-label={`Show ${slide.eyebrow} slide`}
                    >
                      <Image
                        src={slide.image}
                        alt=""
                        fill
                        sizes="172px"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(42,12,58,0) 30%, rgba(42,12,58,0.85) 100%)',
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.22em] text-white/60">
                            {String(index + 1).padStart(2, '0')}
                          </p>
                          <p className="text-xs font-semibold text-white">{slide.eyebrow}</p>
                        </div>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 border border-white/25 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Glass control bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#2A0C3A]/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-3.5 sm:py-4">
            {/* Counter */}
            <div className="flex items-baseline gap-1.5 shrink-0">
              <span className="font-serif text-2xl sm:text-3xl text-white tabular-nums leading-none">
                {String(currentSlide + 1).padStart(2, '0')}
              </span>
              <span className="text-xs text-white/50 tabular-nums">
                / {String(slides.length).padStart(2, '0')}
              </span>
            </div>

            {/* Slide tabs with progress */}
            <div className="flex-1 flex items-center justify-center gap-1 sm:gap-6 min-w-0">
              {slides.map((slide, index) => {
                const isActive = index === currentSlide
                return (
                  <button
                    key={slide.image}
                    type="button"
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to slide ${index + 1}: ${slide.eyebrow}`}
                    aria-current={isActive ? 'true' : undefined}
                    className="group flex flex-col items-stretch gap-2 min-w-0 flex-1 sm:flex-none sm:w-32 px-1 py-1"
                  >
                    <span
                      className={`hidden sm:block text-[11px] uppercase tracking-[0.2em] font-medium truncate text-center transition-colors duration-300 ${
                        isActive ? 'text-white' : 'text-white/45 group-hover:text-white/75'
                      }`}
                    >
                      {slide.eyebrow}
                    </span>
                    <span className="block h-[3px] rounded-full bg-white/15 overflow-hidden">
                      <span
                        className={`block h-full rounded-full ${
                          isActive
                            ? 'bg-white transition-[width] duration-100 ease-linear'
                            : 'bg-white/0 transition-colors duration-300 group-hover:bg-white/40 w-full'
                        }`}
                        style={isActive ? { width: `${progress}%` } : undefined}
                      />
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Arrows */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={prevSlide}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/25 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white transition-all duration-300"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#7B2D8E] hover:bg-[#8F3AA5] flex items-center justify-center text-white transition-all duration-300 shadow-[0_8px_24px_-8px_rgba(123,45,142,0.9)]"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
