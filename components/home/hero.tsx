'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Star } from 'lucide-react'

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const { width, height, left, top } = hero.getBoundingClientRect()
      const x = (clientX - left - width / 2) / 25
      const y = (clientY - top - height / 2) / 25
      
      hero.style.setProperty('--mouse-x', `${x}px`)
      hero.style.setProperty('--mouse-y', `${y}px`)
    }

    hero.addEventListener('mousemove', handleMouseMove)
    return () => hero.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-br from-[#FBF8F4] via-white to-[#f5f0ff]"
      style={{ '--mouse-x': '0px', '--mouse-y': '0px' } as React.CSSProperties}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orb */}
        <div 
          className="absolute top-20 right-20 w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(123, 45, 142, 0.3) 0%, transparent 70%)',
            transform: 'translate(var(--mouse-x), var(--mouse-y))',
            transition: 'transform 0.3s ease-out',
          }}
        />
        <div 
          className="absolute bottom-20 left-10 w-[300px] h-[300px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(196, 30, 142, 0.3) 0%, transparent 70%)',
            transform: 'translate(calc(var(--mouse-x) * -0.5), calc(var(--mouse-y) * -0.5))',
            transition: 'transform 0.3s ease-out',
          }}
        />
        
        {/* Decorative Line */}
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/515516d9-test-bg-shape.png-hMXaTGVS1uqILJSiItT2vqXG3NJ3Z3.webp"
          alt=""
          width={150}
          height={200}
          className="absolute right-[10%] top-[15%] opacity-30 animate-float hidden lg:block"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-16 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Content */}
          <div className="space-y-6 animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-[10px] font-medium uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-pulse" />
              <span>Premium Spa Experience in Lagos</span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-balance">
              <span className="text-gray-900">Your Journey to</span>
              <br />
              <span className="relative">
                <span className="text-[#7B2D8E]">Radiant Skin</span>
                <svg className="absolute -bottom-1 left-0 w-full h-2" viewBox="0 0 200 8" preserveAspectRatio="none">
                  <path d="M0 7 Q 50 0, 100 5 T 200 3" fill="none" stroke="rgba(123, 45, 142, 0.3)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              <span className="text-gray-900">Starts Here</span>
            </h1>

            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed max-w-md text-pretty">
              Experience world-class skincare treatments at Dermaspace. 
              Our expert estheticians combine luxury with results-driven therapies 
              for your ultimate wellness journey.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D4A853] text-[#D4A853]" />
                  ))}
                </div>
                <span className="text-xs text-gray-600">5-Star Rated</span>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold text-[#7B2D8E]">5+</span>
                <span className="text-xs text-gray-600">Years</span>
              </div>
              <div className="h-6 w-px bg-gray-200 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-lg font-semibold text-[#7B2D8E]">2</span>
                <span className="text-xs text-gray-600">Locations</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                asChild
                size="sm"
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-6 h-11 text-xs group"
              >
                <Link href="/booking" className="flex items-center gap-2">
                  Book Appointment
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full px-6 h-11 text-xs border-[#7B2D8E]/30 text-[#7B2D8E] hover:bg-[#7B2D8E]/5 hover:border-[#7B2D8E]"
              >
                <Link href="/services">
                  Explore Services
                </Link>
              </Button>
            </div>
          </div>

          {/* Image Grid */}
          <div className="relative animate-fade-in delay-200">
            <div className="grid grid-cols-2 gap-3">
              {/* Main Image */}
              <div className="col-span-2 relative rounded-2xl overflow-hidden aspect-[16/10]">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                  alt="Dermaspace Spa Interior"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/20 to-transparent" />
              </div>
              
              {/* Secondary Images */}
              <div className="relative rounded-2xl overflow-hidden aspect-square">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                  alt="Facial Treatment"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-square">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp"
                  alt="Spa Treatment"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Floating Card */}
            <div className="absolute -left-6 bottom-16 bg-white rounded-xl p-3 hidden lg:flex items-center gap-2.5 shadow-lg shadow-[#7B2D8E]/5 animate-float" style={{ animationDelay: '0.5s' }}>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#7B2D8E]/10 to-[#C41E8E]/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#7B2D8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-900">Premium Care</p>
                <p className="text-[10px] text-gray-500">Expert Estheticians</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
