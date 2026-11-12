'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  Heart,
  MapPin,
  X,
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

  const nextRoom = useCallback(() => {
    setLightboxIndex((prev) =>
      prev === null ? null : (prev + 1) % filteredRooms.length,
    )
  }, [filteredRooms.length])

  const prevRoom = useCallback(() => {
    setLightboxIndex((prev) =>
      prev === null ? null : (prev - 1 + filteredRooms.length) % filteredRooms.length,
    )
  }, [filteredRooms.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      else if (e.key === 'ArrowRight') nextRoom()
      else if (e.key === 'ArrowLeft') prevRoom()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, nextRoom, prevRoom])

  const activeLightboxRoom =
    lightboxIndex !== null ? filteredRooms[lightboxIndex] ?? null : null

  const bookLocation =
    category !== 'All'
      ? category
      : activeLightboxRoom?.category ?? 'Victoria Island'

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Compact Flat Brand Hero */}
        <section className="bg-[#7B2D8E] py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <MapPin className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-medium text-white uppercase tracking-widest">
                {me?.firstName ? `Welcome, ${me.firstName}` : 'Our Spaces'}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Step Inside Dermaspace
            </h1>
            <p className="text-sm md:text-base text-white/85 max-w-lg mx-auto">
              Browse our reception lounges, private facial rooms, and massage suites in Victoria Island and Ikoyi.
            </p>
          </div>
        </section>

        {/* Clean Filter Bar */}
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
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#7B2D8E] text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]'
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
                      className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {counts[c]}
                    </span>
                  </button>
                )
              })}
            </div>

            <Link
              href={`/booking?location=${encodeURIComponent(bookLocation)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] px-4 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Book {category !== 'All' ? category : 'a Visit'}
            </Link>
          </div>
        </section>

        {/* Proportional 3-Column Room Grid */}
        <section className="py-10 md:py-12 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRooms.map((room, i) => (
                <button
                  key={room.src}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="group flex flex-col text-left rounded-xl overflow-hidden bg-white border border-gray-200 hover:border-[#7B2D8E]/45 transition-colors cursor-pointer"
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
                    <span className="absolute top-2.5 right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#7B2D8E] border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Expand className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4 border-t border-gray-100 bg-white">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-bold text-gray-900 truncate">{room.alt}</h2>
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7B2D8E]">
                          <MapPin className="w-2.5 h-2.5" />
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
                className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                Book Appointment
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Clean Flat Lightbox Modal */}
        {activeLightboxRoom && lightboxIndex !== null && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightboxIndex(null)}
            role="dialog"
            aria-modal="true"
            aria-label={activeLightboxRoom.alt}
          >
            <div
              className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-white border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full aspect-[16/10] max-h-[70vh] bg-gray-950">
                <Image
                  src={activeLightboxRoom.src}
                  alt={activeLightboxRoom.alt}
                  fill
                  priority
                  referrerPolicy="no-referrer"
                  sizes="(max-width: 768px) 100vw, 896px"
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  aria-label="Close fullscreen"
                  className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-800 border border-gray-200 hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={prevRoom}
                  aria-label="Previous room"
                  className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#7B2D8E] border border-gray-200 hover:bg-[#7B2D8E] hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={nextRoom}
                  aria-label="Next room"
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#7B2D8E] border border-gray-200 hover:bg-[#7B2D8E] hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-white border-t border-gray-100">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">{activeLightboxRoom.alt}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#7B2D8E]">
                      <MapPin className="w-3 h-3" />
                      {activeLightboxRoom.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{activeLightboxRoom.caption}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500 tabular-nums">
                    {lightboxIndex + 1} / {filteredRooms.length}
                  </span>
                  <Link
                    href={`/booking?location=${encodeURIComponent(activeLightboxRoom.category)}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] px-4 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    Book {activeLightboxRoom.category}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
