'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Star } from 'lucide-react'

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
        {/* Gradient Orb */}
        <div 
          className="absolute top-20 right-20 w-[500px] h-[500px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(123, 45, 142, 0.3) 0%, transparent 70%)',
            transform: 'translate(var(--mouse-x), var(--mouse-y))',
            transition: 'transform 0.3s ease-out',
          }}
        />
        <div 
          className="absolute bottom-20 left-10 w-[400px] h-[400px] rounded-full opacity-20"
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
          width={200}
          height={300}
          className="absolute right-[10%] top-[15%] opacity-40 animate-float hidden lg:block"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-20 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Premium Spa Experience in Lagos</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-balance">
              <span className="text-gray-900">Your Journey to</span>
              <br />
              <span className="gradient-text">Radiant Skin</span>
              <br />
              <span className="text-gray-900">Starts Here</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-gray-600 leading-relaxed max-w-xl text-pretty">
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
                <span className="text-sm text-gray-600">5-Star Rated</span>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <span className="text-2xl font-bold text-[#7B2D8E]">5+</span>
                <span className="text-sm text-gray-600 ml-1">Years Experience</span>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden sm:block" />
              <div className="hidden sm:block">
                <span className="text-2xl font-bold text-[#7B2D8E]">2</span>
                <span className="text-sm text-gray-600 ml-1">Prime Locations</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button
                asChild
                size="lg"
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-8 h-14 text-base group"
              >
                <Link href="/booking" className="flex items-center gap-2">
                  Book Appointment
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-14 text-base border-[#7B2D8E] text-[#7B2D8E] hover:bg-[#7B2D8E]/5"
              >
                <Link href="/services">
                  Explore Services
                </Link>
              </Button>
            </div>
          </div>

          {/* Image Grid */}
          <div className="relative animate-fade-in delay-200">
            <div className="grid grid-cols-2 gap-4">
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
            <div className="absolute -left-8 bottom-20 bg-white rounded-xl p-4 hidden lg:flex items-center gap-3 animate-float" style={{ animationDelay: '0.5s' }}>
              <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Premium Care</p>
                <p className="text-xs text-gray-500">Expert Estheticians</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
