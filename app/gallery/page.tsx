'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import {
  ArrowRight,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Expand,
  Eye,
  EyeOff,
  Heart,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

type LocationKey = 'Victoria Island' | 'Ikoyi'

type Room = {
  src: string
  alt: string
  category: LocationKey
  caption: string
}

const rooms: Room[] = [
  // Victoria Island
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg',
    alt: 'Reception Area',
    category: 'Victoria Island',
    caption: 'Warm lighting and reception welcome at our VI studio.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg',
    alt: 'Main Lobby',
    category: 'Victoria Island',
    caption: 'Calm arrival lounge where every appointment begins.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2813%29-3ARzEcEW2Bn2R4yMKrUaohoV3DaFct.jpg',
    alt: 'Lobby Lounge',
    category: 'Victoria Island',
    caption: 'A quiet seating corner to settle in before treatment.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2814%29-Ah7kChqKLLYSIrv2k7TqmQ11E424mH.jpg',
    alt: 'Reception Desk',
    category: 'Victoria Island',
    caption: 'Seamless check-in with our front-of-house team.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%288%29-7srs2qstY6dOLqJY5AtU5ZfiIrAHDS.jpg',
    alt: 'Nail Station',
    category: 'Victoria Island',
    caption: 'Dedicated manicure and pedicure treatment suite.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%289%29-Nt4ldllYbTN5lMVxwZYQ9Lb2vTgxB1.jpg',
    alt: 'Treatment Room',
    category: 'Victoria Island',
    caption: 'Private facial and skincare treatment room.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2810%29-ricU7Xkvb3qtQvdn6XRwTUFco8ZQWW.jpg',
    alt: 'Treatment Suite',
    category: 'Victoria Island',
    caption: 'Spacious flagship suite for restorative rituals.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2811%29-PxOYury3WDyxhPQkF5P1zxryCDeUzW.jpg',
    alt: 'Massage Room',
    category: 'Victoria Island',
    caption: 'Low-lit room built for unhurried massage therapy.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2815%29-YeaDpqhDMkIFkzfjMH2f60puI7CeFr.jpg',
    alt: 'Building Exterior',
    category: 'Victoria Island',
    caption: '237B Muri Okunola Street, Victoria Island.',
  },
  // Ikoyi
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3360.JPG-bJ57ZV3Wl1GImeuHYSeNTlnS0GUCVs.jpeg',
    alt: 'Reception',
    category: 'Ikoyi',
    caption: 'Welcome desk at Dermaspace Ikoyi.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3359.JPG-L2ErLSUMlWNQgHhioWe6yVPM9XVb6z.jpeg',
    alt: 'Reception Lounge',
    category: 'Ikoyi',
    caption: 'Front desk and tranquil guest seating.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3358.JPG-v11vKVvcuEj7al4KIOnMq1wd8H5dic.jpeg',
    alt: 'Lounge Area',
    category: 'Ikoyi',
    caption: 'Soft seating and natural daylight.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3365.JPG-BaeXn9oZhcXvqPjAF7UXZ5xMoALDXx.jpeg',
    alt: 'Waiting Area',
    category: 'Ikoyi',
    caption: 'Designed to help you unwind the moment you arrive.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3366.JPG-OPbCFGtQYVb7tLU5XPfzg9RPXZ8Kzi.jpeg',
    alt: 'Pedicure Lounge',
    category: 'Ikoyi',
    caption: 'Comfortable pedicure lounge for quiet relaxation.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3371.JPG-KIOf6sbksYGE8PoJuir8tfR9EQfobA.jpeg',
    alt: 'Private Treatment Room',
    category: 'Ikoyi',
    caption: 'Calm, clinical-grade private facial room.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3369.JPG-Tv3PEg3TqjOgEem6DAtDw5Pk4MrqA5.jpeg',
    alt: 'Massage Suite',
    category: 'Ikoyi',
    caption: 'Quiet massage suite with ambient lighting.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3363.JPG-xnBAz6JBg6O8ijVFoxk3dA3tPQHfSn.jpeg',
    alt: 'Ikoyi Entrance',
    category: 'Ikoyi',
    caption: 'Step off the street into calm.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3362.JPG-I2CGV9YYsnmZzBjUrAD51v0FdJe9yc.jpeg',
    alt: 'Interior Details',
    category: 'Ikoyi',
    caption: 'Thoughtful touches throughout our Ikoyi studio.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3367.JPG-IvWEKkKXQ7GZmRiUaLIUSeoLrPTLIo.jpeg',
    alt: 'Studio Dispensary',
    category: 'Ikoyi',
    caption: 'Skincare formulations organized for every session.',
  },
]

const categories = ['All', 'Victoria Island', 'Ikoyi'] as const
type Category = (typeof categories)[number]

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)

function categoryFromPreference(pref?: string | null): Category | null {
  if (!pref) return null
  const p = pref.trim().toLowerCase()
  if (!p) return null
  if (p === 'victoria island' || p === 'vi' || p.includes('victoria')) {
    return 'Victoria Island'
  }
  if (p === 'ikoyi' || p.includes('ikoyi')) return 'Ikoyi'
  return null
}

export default function GalleryPage() {
  const { data: meData } = useSWR<{
    user?: {
      firstName?: string
      preferredLocation?: string
    } | null
  }>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })

  const me = meData?.user ?? null
  const preferredCategory = useMemo(
    () => categoryFromPreference(me?.preferredLocation),
    [me?.preferredLocation],
  )

  const [category, setCategory] = useState<Category>('All')
  const [hasAppliedPref, setHasAppliedPref] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Immersive viewer controls
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain')
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [hudVisible, setHudVisible] = useState(true)

  const filmstripRef = useRef<HTMLDivElement>(null)
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const dragStartRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    if (hasAppliedPref || !preferredCategory) return
    setCategory(preferredCategory)
    setHasAppliedPref(true)
  }, [preferredCategory, hasAppliedPref])

  const filteredRooms = useMemo(
    () => (category === 'All' ? rooms : rooms.filter((r) => r.category === category)),
    [category],
  )

  const counts = useMemo(
    () => ({
      All: rooms.length,
      'Victoria Island': rooms.filter((r) => r.category === 'Victoria Island').length,
      Ikoyi: rooms.filter((r) => r.category === 'Ikoyi').length,
    }),
    [],
  )

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setHudVisible(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const nextRoom = useCallback(() => {
    setLightboxIndex((prev) =>
      prev === null ? null : (prev + 1) % filteredRooms.length,
    )
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [filteredRooms.length])

  const prevRoom = useCallback(() => {
    setLightboxIndex((prev) =>
      prev === null ? null : (prev - 1 + filteredRooms.length) % filteredRooms.length,
    )
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [filteredRooms.length])

  const cycleZoom = useCallback(() => {
    setZoom((prev) => {
      const next = prev < 1.5 ? 1.85 : prev < 2.3 ? 2.6 : 1
      if (next === 1) setPan({ x: 0, y: 0 })
      return next
    })
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = prev > 2 ? 1.85 : 1
      if (next === 1) setPan({ x: 0, y: 0 })
      return next
    })
  }, [])

  // Lock page scroll while immersive viewer is open
  useEffect(() => {
    if (lightboxIndex === null || typeof document === 'undefined') return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [lightboxIndex])

  // Keyboard shortcuts for desktop immersion
  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowRight') nextRoom()
      else if (e.key === 'ArrowLeft') prevRoom()
      else if (e.key === '+' || e.key === '=') cycleZoom()
      else if (e.key === '-') zoomOut()
      else if (e.key === 'f' || e.key === 'F') {
        setFitMode((m) => (m === 'contain' ? 'cover' : 'contain'))
        resetView()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, closeLightbox, nextRoom, prevRoom, cycleZoom, zoomOut, resetView])

  // Keep active thumbnail centered in the filmstrip
  useEffect(() => {
    if (lightboxIndex === null || !filmstripRef.current) return
    const container = filmstripRef.current
    const activeThumb = container.children[lightboxIndex] as HTMLElement | undefined
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }, [lightboxIndex])

  const activeLightboxRoom =
    lightboxIndex !== null ? filteredRooms[lightboxIndex] ?? null : null

  const bookLocation =
    category !== 'All'
      ? category
      : activeLightboxRoom?.category ?? 'Victoria Island'

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragStartRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: pan.x,
        originY: pan.y,
        moved: false,
      }
      return
    }
    swipeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    }
  }

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStartRef.current
    if (!drag || drag.pointerId !== e.pointerId || zoom <= 1) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      drag.moved = true
    }
    const maxOffset = (zoom - 1) * 260
    setPan({
      x: Math.max(-maxOffset, Math.min(maxOffset, drag.originX + dx)),
      y: Math.max(-maxOffset, Math.min(maxOffset, drag.originY + dy)),
    })
  }

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStartRef.current
    if (drag && drag.pointerId === e.pointerId) {
      const moved = drag.moved
      dragStartRef.current = null
      if (!moved) {
        setHudVisible((v) => !v)
      }
      return
    }

    const swipe = swipeStartRef.current
    swipeStartRef.current = null
    if (!swipe) return
    const dx = e.clientX - swipe.x
    const dy = e.clientY - swipe.y
    const elapsed = Date.now() - swipe.time

    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.25 && elapsed < 700) {
      if (dx < 0) nextRoom()
      else prevRoom()
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      setHudVisible((v) => !v)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Compact Flat Brand Hero */}
        <section className="bg-[#7B2D8E] py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="inline-flex items-center gap-2 text-xs font-medium text-white/85 uppercase tracking-widest mb-3">
              <MapPin className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              <span>
                {me?.firstName ? `Welcome, ${me.firstName}` : 'Our Spaces'}
              </span>
            </p>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 text-balance">
              Step Inside Dermaspace
            </h1>
            <p className="text-sm md:text-base text-white/85 max-w-lg mx-auto">
              Browse our reception lounges, private facial rooms, and massage suites in Victoria Island and Ikoyi. Tap any room to step inside full-screen.
            </p>
          </div>
        </section>

        {/* Filter & Tour Bar */}
        <section className="border-b border-gray-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((c) => {
                const active = category === c
                const isPreferred = preferredCategory === c && c !== 'All'
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCategory(c)
                      setLightboxIndex(null)
                    }}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#7B2D8E] text-white'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]'
                    }`}
                  >
                    {isPreferred && (
                      <Heart
                        className={`h-3 w-3 ${
                          active ? 'fill-white text-white' : 'fill-[#7B2D8E] text-[#7B2D8E]'
                        }`}
                      />
                    )}
                    <span>{c}</span>
                    <span
                      className={`text-[11px] tabular-nums ${
                        active ? 'text-white/80' : 'text-gray-400'
                      }`}
                    >
                      {counts[c]}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              {filteredRooms.length > 0 && (
                <button
                  type="button"
                  onClick={() => openLightbox(0)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:border-[#7B2D8E] hover:text-[#7B2D8E] px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Expand className="w-3.5 h-3.5" />
                  <span>Full-screen tour</span>
                </button>
              )}
              <Link
                href={`/booking?location=${encodeURIComponent(bookLocation)}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] px-4 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Book {category !== 'All' ? category : 'a Visit'}
              </Link>
            </div>
          </div>
        </section>

        {/* Media-First Room Grid */}
        <section className="py-8 md:py-12 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRooms.map((room, i) => (
                <button
                  key={room.src}
                  type="button"
                  onClick={() => openLightbox(i)}
                  className="group flex flex-col text-left rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-[#7B2D8E]/50 transition-colors cursor-pointer"
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
                    <Image
                      src={room.src}
                      alt={room.alt}
                      fill
                      priority={i < 3}
                      referrerPolicy="no-referrer"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm text-white border border-white/20 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Expand className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4 border-t border-gray-100 bg-white">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-bold text-gray-900 truncate">
                          {room.alt}
                        </h2>
                        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-[#7B2D8E]">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {room.category}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {room.caption}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Bottom Callout */}
            <div className="mt-12 rounded-2xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.025] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Ready to visit in person?</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Reserve a facial, massage, or full-day spa package at our Victoria Island or Ikoyi branch.
                </p>
              </div>
              <Link
                href="/booking"
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#7B2D8E] hover:bg-[#5A1D6A] px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                Book Appointment
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Full-Viewport Immersive Spatial Lightbox */}
        {activeLightboxRoom && lightboxIndex !== null && (
          <div
            className="fixed inset-0 z-[100] bg-[#07030A] select-none overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeLightboxRoom.alt} — ${activeLightboxRoom.category}`}
          >
            {/* Ambient room backdrop echo — wraps the whole screen in the room's own tone & lighting */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
              <Image
                src={activeLightboxRoom.src}
                alt=""
                fill
                referrerPolicy="no-referrer"
                sizes="100vw"
                className="object-cover scale-110 blur-2xl opacity-45"
              />
              <div className="absolute inset-0 bg-black/30" />
            </div>

            {/* Full-Viewport Interactive Photo Stage */}
            <div
              className={`relative w-full h-full flex items-center justify-center touch-none ${
                zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
              }`}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              onDoubleClick={cycleZoom}
            >
              <div
                className="relative w-full h-full transition-transform duration-200 ease-out"
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                }}
              >
                <Image
                  src={activeLightboxRoom.src}
                  alt={activeLightboxRoom.alt}
                  fill
                  priority
                  referrerPolicy="no-referrer"
                  sizes="100vw"
                  className={
                    fitMode === 'cover'
                      ? 'object-cover'
                      : 'object-contain'
                  }
                />
              </div>
            </div>

            {/* Minimal restore HUD pill when user hid chrome for 100% unobstructed view */}
            {!hudVisible && (
              <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHudVisible(true)}
                  aria-label="Show gallery controls"
                  className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white text-xs font-medium hover:bg-[#7B2D8E] hover:border-[#7B2D8E] transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Show info</span>
                </button>
                <button
                  type="button"
                  onClick={closeLightbox}
                  aria-label="Close fullscreen"
                  className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white hover:bg-[#7B2D8E] hover:border-[#7B2D8E] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Top Floating Control Bar */}
            {hudVisible && (
              <div className="fixed top-0 inset-x-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-6 pt-3 sm:pt-5 pointer-events-none">
                <div className="pointer-events-auto inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs text-white min-w-0">
                  <span className="font-semibold tabular-nums whitespace-nowrap shrink-0">
                    {lightboxIndex + 1} / {filteredRooms.length}
                  </span>
                  <span className="text-white/40 shrink-0" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-white/90 whitespace-nowrap truncate">
                    <MapPin className="w-3 h-3 text-[#D69CE3] shrink-0" aria-hidden="true" />
                    <span>{activeLightboxRoom.category}</span>
                  </span>
                  {zoom > 1 && (
                    <>
                      <span className="text-white/40 shrink-0" aria-hidden="true">·</span>
                      <span className="font-semibold tabular-nums text-[#D69CE3] whitespace-nowrap shrink-0">
                        {zoom.toFixed(1)}×
                      </span>
                    </>
                  )}
                </div>

                <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setFitMode((m) => (m === 'contain' ? 'cover' : 'contain'))
                      resetView()
                    }}
                    aria-label={fitMode === 'cover' ? 'Show full uncropped frame' : 'Fill entire screen'}
                    title={fitMode === 'cover' ? 'Full frame' : 'Fill screen'}
                    className={`inline-flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:h-10 sm:px-3 rounded-full backdrop-blur-md border text-xs font-medium transition-colors cursor-pointer ${
                      fitMode === 'cover'
                        ? 'bg-[#7B2D8E] border-[#7B2D8E] text-white'
                        : 'bg-black/60 border-white/15 text-white hover:bg-black/80'
                    }`}
                  >
                    {fitMode === 'cover' ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {fitMode === 'cover' ? 'Full frame' : 'Fill screen'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={zoom > 1 ? zoomOut : cycleZoom}
                    aria-label={zoom > 1 ? 'Zoom out' : 'Zoom in'}
                    title={zoom > 1 ? 'Zoom out' : 'Zoom in'}
                    className={`inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full backdrop-blur-md border text-white transition-colors cursor-pointer ${
                      zoom > 1
                        ? 'bg-[#7B2D8E] border-[#7B2D8E]'
                        : 'bg-black/60 border-white/15 hover:bg-black/80'
                    }`}
                  >
                    {zoom > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                  </button>

                  {zoom > 1 && (
                    <button
                      type="button"
                      onClick={resetView}
                      aria-label="Reset zoom"
                      title="Reset zoom"
                      className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-black/80 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setHudVisible(false)}
                    aria-label="Hide gallery controls"
                    title="Hide controls"
                    className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={closeLightbox}
                    aria-label="Close fullscreen"
                    className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-[#7B2D8E] hover:border-[#7B2D8E] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Floating Left / Right Navigation */}
            {hudVisible && filteredRooms.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevRoom}
                  aria-label="Previous room"
                  className="fixed left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-[#7B2D8E] hover:border-[#7B2D8E] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={nextRoom}
                  aria-label="Next room"
                  className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-[#7B2D8E] hover:border-[#7B2D8E] transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Bottom Floating Caption + Filmstrip */}
            {hudVisible && (
              <div className="fixed bottom-0 inset-x-0 z-20 bg-black/65 backdrop-blur-md border-t border-white/10 px-3 sm:px-6 pt-3 pb-3 sm:pb-4">
                <div className="max-w-6xl mx-auto">
                  <div className="flex items-start sm:items-center justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          {activeLightboxRoom.alt}
                        </h3>
                        <span className="hidden sm:inline text-white/40 text-xs" aria-hidden="true">·</span>
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-[#D69CE3] shrink-0">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {activeLightboxRoom.category}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 mt-0.5 line-clamp-2">
                        {activeLightboxRoom.caption}
                      </p>
                    </div>

                    <Link
                      href={`/booking?location=${encodeURIComponent(activeLightboxRoom.category)}`}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] px-3.5 sm:px-4 py-2 text-xs font-semibold text-white transition-colors"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>Book {activeLightboxRoom.category}</span>
                    </Link>
                  </div>

                  {/* Interactive Thumbnail Filmstrip */}
                  {filteredRooms.length > 1 && (
                    <div
                      ref={filmstripRef}
                      className="mt-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide pt-0.5"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {filteredRooms.map((room, idx) => {
                        const isActive = idx === lightboxIndex
                        return (
                          <button
                            key={room.src}
                            type="button"
                            onClick={() => openLightbox(idx)}
                            aria-label={`View ${room.alt}`}
                            aria-current={isActive ? 'true' : undefined}
                            className={`relative shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-lg overflow-hidden transition-all cursor-pointer ${
                              isActive
                                ? 'ring-2 ring-white border border-[#7B2D8E] opacity-100'
                                : 'opacity-50 hover:opacity-85 border border-white/15'
                            }`}
                          >
                            <Image
                              src={room.src}
                              alt={room.alt}
                              fill
                              referrerPolicy="no-referrer"
                              sizes="56px"
                              className="object-cover"
                            />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
