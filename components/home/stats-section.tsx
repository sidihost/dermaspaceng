'use client'

// ---------------------------------------------------------------------------
// Home stats strip
// ---------------------------------------------------------------------------
// Was hard-coded marketing copy (1000 clients, 5000 treatments, 4.9 rating,
// 7 years). Now reads live from /api/home/stats — which is edge-cached with
// `s-maxage=60, stale-while-revalidate=1800` so virtually every visitor
// gets the cached payload instantly while a single visitor per minute
// pays the cold-cache cost. SWR handles client-side polling + focus
// refresh; the previous IntersectionObserver-driven count-up animation is
// preserved so the numbers still ramp up on scroll-into-view.
// ---------------------------------------------------------------------------

import { useEffect, useState, useRef } from 'react'
import { Users, Heart, Star, Clock } from 'lucide-react'
import { useHomeStats } from '@/hooks/use-stats'

// Brand-floor copy values used both as a server-side floor (in the API
// route) and as the SSR/initial-render fallback so the section never
// flashes "0" before the network resolves. These are deliberately the
// same numbers that used to be hard-coded.
const FALLBACK = { clients: 1000, treatments: 5000, rating: 4.9, years: 7 }

function AnimatedNumber({
  value,
  suffix,
  decimal,
}: {
  value: number
  suffix: string
  decimal?: boolean
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const duration = 2000
          const steps = 60
          const stepValue = value / steps
          let current = 0
          const timer = setInterval(() => {
            current += stepValue
            if (current >= value) {
              setCount(value)
              clearInterval(timer)
            } else {
              setCount(current)
            }
          }, duration / steps)
        }
      },
      { threshold: 0.5 },
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, hasAnimated])

  // When the SWR hook resolves a NEW value (e.g. someone signed up
  // during the user's visit and the home count just bumped), we
  // *immediately* show the new number on the next paint instead of
  // re-triggering the count-up — that animation only runs once per
  // mount, but the value should track the live total as it changes.
  useEffect(() => {
    if (hasAnimated) setCount(value)
  }, [value, hasAnimated])

  return (
    <div ref={ref} className="text-2xl md:text-3xl font-bold text-white tabular-nums">
      {decimal ? count.toFixed(1) : Math.floor(count).toLocaleString()}
      {suffix}
    </div>
  )
}

export default function StatsSection() {
  // SWR call: starts with FALLBACK on the very first render, then
  // resolves to the edge-cached payload in well under 100ms in
  // normal conditions. `keepPreviousData` keeps the old number on
  // screen while a refresh is in flight so the strip never flashes.
  const { data } = useHomeStats()

  const live = {
    clients: data?.clients ?? FALLBACK.clients,
    treatments: data?.treatments ?? FALLBACK.treatments,
    rating: data?.rating ?? FALLBACK.rating,
    years: data?.years ?? FALLBACK.years,
  }

  const stats = [
    { value: live.clients, suffix: '+', label: 'Clients on our books', icon: Users },
    { value: live.treatments, suffix: '+', label: 'Treatments done', icon: Heart },
    { value: live.rating, suffix: '', label: 'Google rating', decimal: true, icon: Star },
    { value: live.years, suffix: '+', label: 'Years in Lagos', icon: Clock },
  ]

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-[#7B2D8E] rounded-2xl p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <AnimatedNumber
                      value={stat.value}
                      suffix={stat.suffix}
                      decimal={stat.decimal}
                    />
                  </div>
                  <p className="text-xs md:text-sm text-white/80 font-medium">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
