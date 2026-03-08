import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export default function AboutPreview() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Centered Content */}
        <div className="text-center">
          {/* Section Header */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#7B2D8E]/10 mb-4 sm:mb-5">
            <span className="text-xs sm:text-sm font-semibold text-[#7B2D8E] uppercase tracking-widest">About Us</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 mb-4 sm:mb-5 font-serif">
            Your Journey to <span className="text-[#7B2D8E]">Skin Confidence</span>
          </h2>
          
          {/* Decorative curve */}
          <div className="flex items-center justify-center gap-1 mb-6 sm:mb-8">
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none" className="w-10 sm:w-auto">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#7B2D8E]" />
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none" className="w-10 sm:w-auto">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
          </div>
          
          {/* Image */}
          <div className="relative max-w-2xl mx-auto mb-6 sm:mb-8">
            <div className="relative aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled-670-%C3%83%C2%97-700-px-1-1.png-HAZeviZdNNsUTW1ROSjFnAswOWUN4P.webp"
                alt="Dermaspace Team"
                fill
                className="object-cover object-center"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-3 sm:-bottom-4 -right-3 sm:-right-4 w-16 sm:w-24 h-16 sm:h-24 bg-[#7B2D8E]/10 rounded-full -z-10" />
            <div className="absolute -top-3 sm:-top-4 -left-3 sm:-left-4 w-12 sm:w-16 h-12 sm:h-16 bg-[#7B2D8E]/10 rounded-full -z-10" />
          </div>
          
          {/* Description */}
          <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-5 max-w-2xl mx-auto">
            Dermaspace Esthetic & Wellness Centre is a boutique spa that aims to promote skin confidence and improve body wellness. We are committed to bringing our clients the most effective skincare treatments.
          </p>
          
          <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto">
            Founded in April 2019, we have grown expeditiously and are recognized as one of the best day and esthetic spas in Lagos, Nigeria.
          </p>

          <Link
            href="/about"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[#7B2D8E] text-white text-sm sm:text-base font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
          >
            Learn More About Us
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
