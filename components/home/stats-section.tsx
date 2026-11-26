'use client'

import { useEffect, useState, useRef } from 'react'
import { Users, Heart, Star, Clock } from 'lucide-react'

const stats = [
  { value: 1000, suffix: '+', label: 'Clients on our books', icon: Users },
  { value: 5000, suffix: '+', label: 'Treatments done', icon: Heart },
  { value: 4.9, suffix: '', label: 'Google rating', decimal: true, icon: Star },
  { value: 7, suffix: '+', label: 'Years in Lagos', icon: Clock },
]

function AnimatedNumber({ value, suffix, decimal }: { value: number; suffix: string; decimal?: boolean }) {
  const [count, setCount] = useState(value)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimatedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let timer: ReturnType<typeof setInterval> | null = null

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true
          // Only animate when a user has scrolled down to the stats section;
          // initial loads and crawlers with tall viewports keep the final value.
          if (window.scrollY <= 0) {
            setCount(value)
            return
          }
          const duration = 2000
          const steps = 60
          const stepValue = value / steps
          let current = 0
          setCount(0)
          timer = setInterval(() => {
            current += stepValue
            if (current >= value) {
              setCount(value)
              if (timer) clearInterval(timer)
              timer = null
            } else {
              setCount(current)
            }
          }, duration / steps)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => {
      observer.disconnect()
      if (timer) clearInterval(timer)
    }
  }, [value])

  return (
    <div ref={ref} className="text-2xl md:text-3xl font-bold text-white">
      {decimal ? count.toFixed(1) : Math.floor(count).toLocaleString()}{suffix}
    </div>
  )
}

export default function StatsSection() {
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
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} decimal={stat.decimal} />
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
