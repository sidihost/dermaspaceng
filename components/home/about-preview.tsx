import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export default function AboutPreview() {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        {/* Centered Content */}
        <div className="text-center">
          {/* Section Header */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">About Us</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            A small spa with a <span className="text-[#7B2D8E]">big why</span>
          </h2>
          
          {/* Decorative curve */}
          <div className="flex items-center justify-center gap-1 mb-8">
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
            <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
          </div>
          
          {/* Image */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled-670-%C3%83%C2%97-700-px-1-1.png-HAZeviZdNNsUTW1ROSjFnAswOWUN4P.webp"
                alt="Dermaspace Team"
                fill
                className="object-cover object-center"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#7B2D8E]/10 rounded-full -z-10" />
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-[#7B2D8E]/10 rounded-full -z-10" />
          </div>
          
          {/* Description */}
          <p className="text-base text-gray-600 leading-relaxed mb-4 max-w-2xl mx-auto">
            We opened in 2019 with a simple idea: clean rooms, skilled therapists, and treatments that actually work. No upsells, no gimmicks.
          </p>
          
          <p className="text-base text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto">
            Two branches and thousands of clients later, that&apos;s still how we run things.
          </p>

          <Link
            href="/about"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#5A1D6A] transition-colors"
          >
            Learn More About Us
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
