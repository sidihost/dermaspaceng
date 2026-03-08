import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export default function AboutPreview() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Image */}
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled-670-%C3%83%C2%97-700-px-1-1.png-HAZeviZdNNsUTW1ROSjFnAswOWUN4P.webp"
                alt="Dermaspace Team"
                fill
                className="object-cover"
              />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-3 -right-3 w-full h-full border-2 border-[#7B2D8E]/20 rounded-xl -z-10" />
          </div>

          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
              <span className="text-xs font-medium text-[#7B2D8E] uppercase tracking-wide">About Us</span>
            </div>
            
            <h2 className="text-headline font-semibold text-gray-900 mb-4">
              Your Journey to <span className="text-[#7B2D8E]">Skin Confidence</span>
            </h2>
            
            <p className="text-body text-gray-600 mb-4">
              Dermaspace Esthetic & Wellness Centre is a boutique spa that aims to promote skin confidence and improve body wellness. We are committed to bringing our clients the most effective skincare treatments.
            </p>
            
            <p className="text-body text-gray-600 mb-6">
              Founded in April 2019, we have grown expeditiously and are recognized as one of the best day and esthetic spas in Lagos, Nigeria.
            </p>

            <Link
              href="/about"
              className="btn-hover inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#5A1D6A]"
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
