'use client'

import { useEffect, useState, useRef } from 'react'
import { Users, Heart, Star, Clock } from 'lucide-react'

const stats = [
  { value: 1000, suffix: '+', label: 'Happy Clients', icon: Users },
  { value: 5000, suffix: '+', label: 'Treatments Done', icon: Heart },
  { value: 4.9, suffix: '', label: 'Average Rating', decimal: true, icon: Star },
  { value: 7, suffix: '+', label: 'Years Experience', icon: Clock },
]

function AnimatedNumber({ value, suffix, decimal }: { value: number; suffix: string; decimal?: boolean }) {
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
      { threshold: 0.5 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, hasAnimated])

  return (
    <div ref={ref} className="text-2xl md:text-3xl font-bold text-white">
      {decimal ? count.toFixed(1) : Math.floor(count).toLocaleString()}{suffix}
    </div>
  )
}

export default function StatsSection() {
  return (
    <section className="py-12 bg-[#FDFBF9]">
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
