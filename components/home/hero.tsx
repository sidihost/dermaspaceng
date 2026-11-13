'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Snowflake, Star } from 'lucide-react'
import { ChristmasHeroIllustration } from './christmas-hero-illustration'

// Toggle to false (or turn off Festive in Admin) to revert the hero back to the 3 standard slides.
const CHRISTMAS_HERO_SLIDE_ENABLED = true

const festiveFetcher = (url: string) => fetch(url).then((r) => r.json())

interface HeroSlide {
  image: string
  eyebrow: string
  title: string
  highlight: string
  description: string
  secondaryLabel: string
  secondaryHref: string
  festive?: boolean
}

const CHRISTMAS_SLIDE: HeroSlide = {
  image: '/images/hero-christmas-luxury-3d.jpg',
  eyebrow: 'Christmas at Dermaspace',
  title: 'Wrapped in calm,',
  highlight: 'gifted with glow',
  description:
    'Treat yourself or someone special to restorative spa rituals, festive packages, and gift cards this season.',
  secondaryLabel: 'Explore Packages',
  secondaryHref: '/packages',
  festive: true,
}

const BASE_SLIDES: HeroSlide[] = [
  {
    image: '/images/hero-1.jpg',
    eyebrow: 'Skin Care',
    title: 'Skin that feels',
    highlight: 'like yours',
    description:
      'Facials, peels and treatments for Lagos weather and Lagos skin. No gimmicks, just results you can see.',
    secondaryLabel: 'View Services',
    secondaryHref: '/services',
  },
  {
    image: '/images/hero-2.jpg',
    eyebrow: 'Body & Spa',
    title: 'An afternoon',
    highlight: 'off your shoulders',
    description:
      'Massages, scrubs and steam in a quiet room. You walk out lighter than you walked in.',
    secondaryLabel: 'View Services',
    secondaryHref: '/services',
  },
  {
    image: '/images/hero-3.jpg',
    eyebrow: 'Therapy',
    title: 'A therapist who',
    highlight: 'knows your skin',
    description:
      'We listen first, recommend second, and build a plan that fits your life.',
    secondaryLabel: 'View Services',
    secondaryHref: '/services',
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
  const words = text.split(' ')
  let charOffset = 0

  return (
    <span
      className={`inline-block ${className}`}
      aria-label={text}
    >
      {words.map((word, wordIdx) => {
        const wordStart = charOffset
        charOffset += word.length + 1
        return (
          <span key={`word-${wordIdx}`}>
            <span className="inline-block whitespace-nowrap">
              {word.split('').map((char, i) => (
                <span
                  key={`${char}-${wordStart + i}`}
                  aria-hidden="true"
                  className="inline-block overflow-hidden align-baseline -my-[0.08em]"
                  style={{
                    padding: '0.08em 0.03em 0.14em',
                    lineHeight: '1.08em',
                  }}
                >
                  <span
                    className={`inline-block ${italic ? 'italic' : ''}`}
                    style={{
                      animationName: 'hero-char-in',
                      animationDuration: '600ms',
                      animationTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                      animationFillMode: 'both',
                      animationDelay: `${baseDelay + (wordStart + i) * step}ms`,
                    }}
                  >
                    {char}
                  </span>
                </span>
              ))}
            </span>
            {wordIdx < words.length - 1 ? '\u00A0' : null}
          </span>
        )
      })}
    </span>
  )
}

export default function Hero() {
  const { data: festiveData } = useSWR<{ enabled: boolean }>(
    CHRISTMAS_HERO_SLIDE_ENABLED ? '/api/festive' : null,
    festiveFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  )

  const showChristmasSlide =
    CHRISTMAS_HERO_SLIDE_ENABLED && (festiveData ? festiveData.enabled !== false : true)

  const slides = useMemo(
    () => (showChristmasSlide ? [CHRISTMAS_SLIDE, ...BASE_SLIDES] : BASE_SLIDES),
    [showChristmasSlide],
  )

  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)

  const safeSlideIndex = currentSlide % slides.length

  const goToSlide = useCallback(
    (index: number) => {
      if (index === safeSlideIndex) return
      setCurrentSlide(index)
      progressRef.current = 0
      setProgress(0)
    },
    [safeSlideIndex],
  )

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    progressRef.current = 0
    setProgress(0)
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    progressRef.current = 0
    setProgress(0)
  }, [slides.length])

  useEffect(() => {
    if (isPaused) return
    const progressInterval = setInterval(() => {
      const nextVal = progressRef.current + 1.67
      if (nextVal >= 100) {
        progressRef.current = 0
        setProgress(0)
        setCurrentSlide((prev) => (prev + 1) % slides.length)
      } else {
        progressRef.current = nextVal
        setProgress(nextVal)
      }
    }, 100)
    return () => clearInterval(progressInterval)
  }, [isPaused, slides.length])

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const active = slides[safeSlideIndex]

  // Duration to finish the character stagger before drawing the underline
  const titleStepMs = 28
  const highlightDelay = active.title.length * titleStepMs + 180
  const underlineDelay = highlightDelay + active.highlight.length * titleStepMs + 120

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative h-[480px] sm:h-[520px] lg:h-[560px] bg-white overflow-hidden"
    >
      {/* Background Slider */}
      <div className="absolute inset-0 bg-[#240933]">
        {slides.map((slide, index) => (
          <div
            key={slide.eyebrow}
            className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${
              index === safeSlideIndex ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {slide.festive ? (
              <ChristmasHeroIllustration active={index === safeSlideIndex} />
            ) : (
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                sizes="100vw"
                referrerPolicy="no-referrer"
                className={`object-cover object-[center_28%] transition-transform duration-[6000ms] ease-out ${
                  index === safeSlideIndex ? 'scale-105' : 'scale-100'
                }`}
                priority={index === 0}
              />
            )}
          </div>
        ))}

        {/* Clean solid contrast veil (zero CSS gradients, zero CSS shadows) */}
        {active.festive ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none bg-[#240933]/25 md:bg-transparent transition-opacity duration-700"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none bg-[#240933]/48 transition-opacity duration-700"
          />
        )}
      </div>

      {/* --- Standard slide ambient petals (solid SVG fills, zero shadows/gradients) --- */}
      {!active.festive && (
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
              className="hero-ambient absolute block"
              style={{
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size * 1.4,
                animation: `hero-petal ${p.dur} linear ${p.delay} infinite`,
              }}
            >
              <svg viewBox="0 0 10 14" className="w-full h-full">
                <path
                  d="M5 0 C8 3, 9 8, 5 14 C1 8, 2 3, 5 0 Z"
                  fill="rgba(216, 180, 254, 0.55)"
                />
              </svg>
            </span>
          ))}
        </div>
      )}

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

      {/* Right edge vertical slide meter (desktop only, interactive) */}
      <div
        className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 flex-col items-end gap-2.5"
      >
        {slides.map((slide, i) => (
          <button
            key={slide.eyebrow}
            type="button"
            onClick={() => goToSlide(i)}
            aria-label={`Jump to slide ${i + 1}: ${slide.eyebrow}`}
            className="group/meter flex items-center gap-2 py-0.5 cursor-pointer"
          >
            <span
              className={`font-mono text-[10px] tabular-nums transition-colors duration-300 ${
                i === safeSlideIndex
                  ? 'text-white font-semibold'
                  : 'text-white/45 group-hover/meter:text-white/80'
              }`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              className={`block w-px origin-center transition-all duration-500 ${
                i === safeSlideIndex
                  ? 'h-10 bg-white'
                  : 'h-4 bg-white/40 group-hover/meter:bg-white/75'
              }`}
              style={
                i === safeSlideIndex
                  ? { animation: 'hero-tick-pulse 2.8s ease-in-out infinite' }
                  : undefined
              }
            />
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
            <div className="max-w-2xl">
              {/* Eyebrow */}
              <div
                key={`eyebrow-${safeSlideIndex}`}
                className="relative mb-3 sm:mb-4 flex items-center gap-2.5 sm:gap-3"
              >
                {active.festive ? (
                  <>
                    <Snowflake
                      aria-hidden="true"
                      className="w-3.5 h-3.5 text-[#E9D5FF] shrink-0"
                      style={{ animation: 'hero-char-in 520ms ease-out 40ms both' }}
                    />
                    <span
                      className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.28em] text-[#F5ECF8]"
                      style={{
                        animation: 'hero-char-in 520ms ease-out 100ms both',
                      }}
                    >
                      {active.eyebrow}
                    </span>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {/* Title with per-character reveal */}
              <div
                key={`title-${safeSlideIndex}`}
                className="relative mb-3 sm:mb-4"
              >
                <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-white leading-[1.08] tracking-tight text-balance">
                  <AnimatedText
                    text={active.title}
                    baseDelay={0}
                    step={titleStepMs}
                  />
                  <br />
                  <span className="relative inline-block pb-3 sm:pb-4">
                    <span className="font-serif italic font-normal text-white">
                      <AnimatedText
                        text={active.highlight}
                        baseDelay={highlightDelay}
                        step={titleStepMs}
                        italic
                      />
                      <span
                        className={`${
                          active.festive ? 'text-[#D8B4FE]' : 'text-[#7B2D8E]'
                        } inline-block`}
                        style={{
                          animation: `hero-char-in 500ms ease-out ${underlineDelay}ms both`,
                        }}
                      >
                        .
                      </span>
                    </span>

                    {/* Clean highlight flourish — clip-path reveal on Christmas slide (zero dashes) */}
                    <svg
                      aria-hidden="true"
                      className="absolute left-0 bottom-0 w-full h-3 pointer-events-none"
                      viewBox="0 0 240 12"
                      preserveAspectRatio="none"
                    >
                      {active.festive ? (
                        <path
                          d="M2 8 C 40 3, 95 10, 140 5 S 212 3, 238 7"
                          fill="none"
                          stroke="#D8B4FE"
                          strokeWidth="2"
                          strokeLinecap="round"
                          style={{
                            animation: `hero-underline-reveal 750ms cubic-bezier(0.22, 1, 0.36, 1) ${underlineDelay}ms both`,
                          }}
                        />
                      ) : (
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
                      )}
                    </svg>
                  </span>
                </h1>
              </div>

              {/* Description */}
              <div
                key={`desc-${safeSlideIndex}`}
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
                key={`cta-${safeSlideIndex}`}
                className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-5"
                style={{
                  animation: `hero-char-in 700ms ease-out ${underlineDelay + 280}ms both`,
                }}
              >
                <button
                  onClick={scrollToBooking}
                  className="group relative inline-flex items-center gap-2 pl-5 pr-2 py-2 bg-white hover:bg-[#F5ECF8] text-[#7B2D8E] text-sm font-semibold rounded-full transition-colors duration-300"
                >
                  <span className="relative">Book Appointment</span>
                  <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#7B2D8E] text-white transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
                <Link
                  href={active.secondaryHref}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-full border border-white/40 hover:bg-white/10 hover:border-white/60 transition-all duration-300"
                >
                  {active.secondaryLabel}
                </Link>
              </div>

              {/* Trust Indicators - Hidden on mobile */}
              <div
                key={`trust-${safeSlideIndex}`}
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
                        referrerPolicy="no-referrer"
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/80">
                      <Image
                        src="/images/client-2.jpg"
                        alt="Happy client"
                        width={28}
                        height={28}
                        referrerPolicy="no-referrer"
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/80">
                      <Image
                        src="/images/client-3.jpg"
                        alt="Happy client"
                        width={28}
                        height={28}
                        referrerPolicy="no-referrer"
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
                        className="w-3.5 h-3.5 text-white fill-white"
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
                  {String(safeSlideIndex + 1).padStart(2, '0')}
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

              {/* Mobile Slide Dots */}
              <div className="flex md:hidden items-center gap-1.5" aria-label="Hero slide pagination">
                {slides.map((slide, i) => (
                  <button
                    key={slide.eyebrow}
                    type="button"
                    onClick={() => goToSlide(i)}
                    aria-label={`Go to slide ${i + 1}: ${slide.eyebrow}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === safeSlideIndex
                        ? 'w-6 bg-[#7B2D8E]'
                        : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevSlide}
                  className="w-10 h-10 rounded-full border border-gray-200 hover:border-[#7B2D8E] hover:text-[#7B2D8E] flex items-center justify-center text-gray-600 transition-colors duration-200"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="w-10 h-10 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] flex items-center justify-center text-white transition-colors duration-200"
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
