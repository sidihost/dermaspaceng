'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react'

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
    <span
      className={`inline-block ${className}`}
      aria-label={text}
    >
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
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide()
          return 0
        }
        return prev + 1.67
      })
    }, 100)
    return () => clearInterval(progressInterval)
  }, [nextSlide])

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const active = slides[currentSlide]

  // Duration to finish the character stagger before drawing the underline
  const titleStepMs = 28
  const highlightDelay = active.title.length * titleStepMs + 180
  const underlineDelay = highlightDelay + active.highlight.length * titleStepMs + 120

  return (
    <section className="relative h-[480px] sm:h-[520px] lg:h-[560px] bg-white overflow-hidden">
      {/* Background Slider */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className={`object-cover transition-transform duration-[6000ms] ease-out ${
                index === currentSlide ? 'scale-105' : 'scale-100'
              }`}
              priority={index === 0}
            />
          </div>
        ))}

        {/* Cinematic overlays — dark bottom-left for copy legibility */}
        <div aria-hidden="true" className="absolute inset-0 bg-black/30" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0.05) 100%)',
          }}
        />
        {/* Top fade — ensures the eyebrow stays legible on slides
            where the upper portion of the photo is a warm skin tone
            or bright background. Without this, text-white/95 blends
            into the image and reads as dull brown. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-28 sm:h-32"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 100%)',
          }}
        />
        {/* Edge vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)',
          }}
        />
      </div>

      {/* --- Signature spa ambient layers --- */}

      {/* Rising steam wisps (right side) */}
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

      {/* Drifting petals — larger, more numerous, with a soft halo so
          they stay visible against both bright skin tones and dark
          backgrounds in the spa photography. A gentle drop-shadow on
          each SVG acts as the halo without the overhead of a second
          element per petal. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        {[
          { top: '-6%',  left: '12%', delay: '0s',    dur: '16s', size: 11 },
          { top: '-8%',  left: '28%', delay: '3.5s',  dur: '20s', size: 9  },
          { top: '-10%', left: '46%', delay: '1.2s', dur: '22s', size: 12 },
          { top: '-6%',  left: '62%', delay: '7s',    dur: '18s', size: 9  },
          { top: '-10%', left: '78%', delay: '4.2s', dur: '24s', size: 10 },
          { top: '-8%',  left: '90%', delay: '10s',   dur: '19s', size: 11 },
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
              // Soft white halo keeps brand-purple petals readable on
              // darker parts of the photography without changing colour.
              filter:
                'drop-shadow(0 0 5px rgba(255,255,255,0.55)) drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
            }}
          >
            <svg viewBox="0 0 10 14" className="w-full h-full">
              <path
                d="M5 0 C8 3, 9 8, 5 14 C1 8, 2 3, 5 0 Z"
                fill="rgba(123, 45, 142, 0.78)"
              />
            </svg>
          </span>
        ))}
      </div>

      {/* Left edge vertical wordmark (desktop only) */}
      <div
        aria-hidden="true"
        className="hidden lg:flex absolute left-5 top-0 bottom-24 items-center pointer-events-none"
      >
        <span
          className="text-[10px] font-medium uppercase tracking-[0.5em] text-white/50 whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Dermaspace · Estd. 2014
        </span>
      </div>

      {/* Right edge vertical slide meter (desktop only) */}
      <div
        aria-hidden="true"
        className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col items-center gap-3 pointer-events-none"
      >
        {slides.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`font-mono text-[10px] tabular-nums transition-colors duration-500 ${
                i === currentSlide ? 'text-white' : 'text-white/40'
              }`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              className={`block w-px origin-center transition-all duration-500 ${
                i === currentSlide
                  ? 'h-10 bg-white'
                  : 'h-4 bg-white/40'
              }`}
              style={
                i === currentSlide
                  ? { animation: 'hero-tick-pulse 2.8s ease-in-out infinite' }
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
            <div className="max-w-2xl">
              {/* Eyebrow — hairlines grow on both sides */}
              <div
                key={`eyebrow-${currentSlide}`}
                className="relative mb-3 sm:mb-4 flex items-center gap-3"
              >
                <span
                  className="h-px bg-white/70"
                  style={{
                    animation: 'hero-char-in 520ms ease-out both',
                    width: '32px',
                  }}
                />
                <span
                  className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.32em] text-white"
                  style={{
                    animation: 'hero-char-in 520ms ease-out 120ms both',
                    // Soft shadow keeps the eyebrow readable on any
                    // photo the slider lands on, regardless of the
                    // background tone under its position.
                    textShadow: '0 1px 10px rgba(0,0,0,0.6)',
                  }}
                >
                  {active.eyebrow}
                </span>
                <span
                  className="h-px bg-white/20 flex-1 max-w-[80px]"
                  style={{
                    animation: 'hero-char-in 520ms ease-out 220ms both',
                  }}
                />
              </div>

              {/* Title with per-character reveal */}
              <div
                key={`title-${currentSlide}`}
                className="relative mb-3 sm:mb-4"
              >
                <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-white leading-[1.08] tracking-tight text-balance">
                  <AnimatedText
                    text={active.title}
                    baseDelay={0}
                    step={titleStepMs}
                  />
                  <br />
                  <span
                    className="relative inline-block pb-3 sm:pb-4"
                    style={{
                      // Soft shadow so the italic text stays legible over
                      // bright highlights in the photography.
                      textShadow: '0 2px 20px rgba(0,0,0,0.35)',
                    }}
                  >
                    <span className="font-serif italic font-normal text-white">
                      <AnimatedText
                        text={active.highlight}
                        baseDelay={highlightDelay}
                        step={titleStepMs}
                        italic
                      />
                      <span
                        className="text-[#7B2D8E] inline-block"
                        style={{
                          animation: `hero-char-in 500ms ease-out ${underlineDelay}ms both`,
                        }}
                      >
                        .
                      </span>
                    </span>

                    {/* Ornate hand-drawn underline — sits below descenders */}
                    <svg
                      aria-hidden="true"
                      className="absolute left-0 bottom-0 w-full h-3 pointer-events-none"
                      viewBox="0 0 240 12"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M2 8 C 40 2, 90 12, 130 5 S 210 2, 238 7"
                        fill="none"
                        stroke="#7B2D8E"
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
              <div
                key={`desc-${currentSlide}`}
                className="relative mb-4 sm:mb-5 min-h-[48px] sm:min-h-[52px]"
              >
                <p
                  className="text-sm sm:text-base text-white/85 max-w-md leading-relaxed"
                  style={{
                    animation: `hero-char-in 700ms ease-out ${underlineDelay + 150}ms both`,
                  }}
                >
                  {active.description}
                </p>
              </div>

              {/* CTA Buttons */}
              <div
                key={`cta-${currentSlide}`}
                className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-5"
                style={{
                  animation: `hero-char-in 700ms ease-out ${underlineDelay + 280}ms both`,
                }}
              >
                <button
                  onClick={scrollToBooking}
                  className="group inline-flex items-center gap-2 pl-5 pr-2 py-2 bg-white hover:bg-white text-[#7B2D8E] text-sm font-semibold rounded-full transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  Book Appointment
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#7B2D8E] text-white transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-full border border-white/40 hover:bg-white/10 hover:border-white/60 transition-all duration-300"
                >
                  View Services
                </Link>
              </div>

              {/* Trust Indicators - Hidden on mobile */}
              <div
                key={`trust-${currentSlide}`}
                className="hidden sm:flex flex-wrap items-center gap-x-6 gap-y-2"
                style={{
                  animation: `hero-char-in 700ms ease-out ${underlineDelay + 400}ms both`,
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/80">
                      <Image
                        src="/images/client-1.jpg"
                        alt="Happy client"
                        width={28}
                        height={28}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/80">
                      <Image
                        src="/images/client-2.jpg"
                        alt="Happy client"
                        width={28}
                        height={28}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/80">
                      <Image
                        src="/images/client-3.jpg"
                        alt="Happy client"
                        width={28}
                        height={28}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white/80">
                      5K+
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-white/85">
                    Happy Clients
                  </span>
                </div>

                <span aria-hidden="true" className="h-4 w-px bg-white/25" />

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 text-[#FFD27A] fill-[#FFD27A]"
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm text-white/85">
                    4.9 Rating
                  </span>
                </div>

                <span aria-hidden="true" className="h-4 w-px bg-white/25" />

                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-xs sm:text-sm text-white/85">
                    2 Locations in Lagos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              {/* Slide Counter + Progress */}
              <div className="flex items-center gap-3">
                <span className="font-serif text-2xl font-semibold text-[#7B2D8E] tabular-nums">
                  {String(currentSlide + 1).padStart(2, '0')}
                </span>
                <div className="w-16 sm:w-24 h-[3px] bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7B2D8E] transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-400 tabular-nums">
                  / {String(slides.length).padStart(2, '0')}
                </span>
              </div>

              {/* Current Slide Label — desktop only */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.22em] font-medium text-gray-400">
                  Now showing
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {active.eyebrow}
                </span>
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSlide}
                  className="w-10 h-10 rounded-full border border-gray-200 hover:border-[#7B2D8E] hover:text-[#7B2D8E] flex items-center justify-center text-gray-600 transition-all duration-300"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-10 h-10 rounded-full bg-[#7B2D8E] hover:bg-[#6A2579] flex items-center justify-center text-white transition-all duration-300"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
