'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Star, Play } from 'lucide-react'

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
      className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#FBF8F4] via-white to-[#f5f0ff]"
      style={{ '--mouse-x': '0px', '--mouse-y': '0px' } as React.CSSProperties}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div 
          className="absolute top-20 right-20 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(123, 45, 142, 0.3) 0%, transparent 70%)',
            transform: 'translate(var(--mouse-x), var(--mouse-y))',
            transition: 'transform 0.3s ease-out',
          }}
        />
        <div 
          className="absolute bottom-20 left-10 w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(196, 30, 142, 0.3) 0%, transparent 70%)',
            transform: 'translate(calc(var(--mouse-x) * -0.5), calc(var(--mouse-y) * -0.5))',
            transition: 'transform 0.3s ease-out',
          }}
        />
        
        {/* Decorative Pattern */}
        <div className="absolute top-1/4 right-[5%] w-32 h-32 opacity-10">
          <div className="w-full h-full border-2 border-[#7B2D8E] rounded-full" />
          <div className="absolute top-4 left-4 right-4 bottom-4 border border-[#7B2D8E] rounded-full" />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
              <span className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
              <span className="text-sm font-medium">Premium Spa Experience in Lagos</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
              <span className="text-gray-900">Your Journey to</span>
              <br />
              <span className="relative inline-block">
                <span className="text-[#7B2D8E]">Radiant Skin</span>
                <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0 10 Q 50 0, 100 8 T 200 6" fill="none" stroke="rgba(212, 168, 83, 0.5)" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              <span className="text-gray-900">Starts Here</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
              Experience world-class skincare treatments at Dermaspace. 
              Our expert estheticians combine luxury with results-driven therapies 
              for your ultimate wellness journey.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-[#D4A853] text-[#D4A853]" />
                  ))}
                </div>
                <span className="text-sm text-gray-600 font-medium">5-Star Rated</span>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#7B2D8E]">5+</span>
                <span className="text-sm text-gray-600">Years Experience</span>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-2xl font-bold text-[#7B2D8E]">2</span>
                <span className="text-sm text-gray-600">Locations</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button
                asChild
                size="lg"
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-8 h-14 text-base font-medium group shadow-xl shadow-[#7B2D8E]/20"
              >
                <Link href="/booking" className="flex items-center gap-2">
                  Book Appointment
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-14 text-base font-medium border-2 border-[#7B2D8E]/30 text-[#7B2D8E] hover:bg-[#7B2D8E]/5 hover:border-[#7B2D8E]"
              >
                <Link href="/services" className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Explore Services
                </Link>
              </Button>
            </div>
          </div>

          {/* Image Grid */}
          <div className="relative animate-fade-in delay-200">
            <div className="grid grid-cols-12 gap-4">
              {/* Main Large Image */}
              <div className="col-span-12 relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl shadow-[#7B2D8E]/10">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                  alt="Dermaspace Spa Interior"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/30 to-transparent" />
                
                {/* Overlay Badge */}
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg">
                    <p className="text-sm font-semibold text-gray-900">Victoria Island Location</p>
                    <p className="text-xs text-gray-500">237B Muri Okunola Street</p>
                  </div>
                </div>
              </div>
              
              {/* Secondary Images */}
              <div className="col-span-6 relative rounded-2xl overflow-hidden aspect-square shadow-xl">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                  alt="Facial Treatment"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/20 to-transparent" />
              </div>
              <div className="col-span-6 relative rounded-2xl overflow-hidden aspect-square shadow-xl">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp"
                  alt="Spa Treatment"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/20 to-transparent" />
              </div>
            </div>

            {/* Floating Card */}
            <div className="absolute -left-8 top-1/3 bg-white rounded-2xl p-4 hidden lg:flex items-center gap-3 shadow-2xl shadow-[#7B2D8E]/10 animate-float">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2D8E] to-[#C41E8E] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">Premium Care</p>
                <p className="text-sm text-gray-500">Expert Estheticians</p>
              </div>
            </div>

            {/* Second Floating Card */}
            <div className="absolute -right-4 bottom-1/4 bg-white rounded-2xl p-4 hidden lg:flex items-center gap-3 shadow-2xl shadow-[#7B2D8E]/10 animate-float" style={{ animationDelay: '1s' }}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4A853] to-[#B8942F] flex items-center justify-center">
                <Star className="w-6 h-6 text-white fill-white" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">Trusted</p>
                <p className="text-sm text-gray-500">1000+ Happy Clients</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
