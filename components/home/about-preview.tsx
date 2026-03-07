import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export default function AboutPreview() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Image Side */}
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled-670-%C3%83%C2%97-700-px-1-1.png-HAZeviZdNNsUTW1ROSjFnAswOWUN4P.webp"
                alt="Dermaspace Team"
                fill
                className="object-cover object-center"
              />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#7B2D8E]/10 rounded-full -z-10" />
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-[#7B2D8E]/15 rounded-full -z-10" />
          </div>

          {/* Content Side */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-0.5 bg-[#7B2D8E]" />
              <svg className="w-4 h-4 text-[#7B2D8E]/40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div className="w-10 h-0.5 bg-[#7B2D8E]" />
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              About Us
            </h2>
            
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Dermaspace Esthetic & Wellness Centre is a boutique spa that aims to promote skin confidence and improve body wellness. We are committed to bringing our clients the most effective skincare treatments.
            </p>
            
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Founded in April 2019, we have grown expeditiously and are recognized as one of the best day and esthetic spas in Lagos, Nigeria.
            </p>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              Learn More
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
