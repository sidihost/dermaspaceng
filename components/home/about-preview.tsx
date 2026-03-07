'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function AboutPreview() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-0.5 bg-[#7B2D8E]" />
            <svg className="w-5 h-5 text-[#7B2D8E]/50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" opacity="0.3" />
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <div className="w-12 h-0.5 bg-[#7B2D8E]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            About Us
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image with decorative elements */}
          <div className="relative order-2 lg:order-1">
            <div className="relative">
              {/* Main image */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src="/images/itunu.webp"
                  alt="Itunuoluwa Umar-Lawal - CEO of Dermaspace"
                  width={500}
                  height={600}
                  className="w-full object-cover"
                />
              </div>
              {/* Decorative accent */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-[#D4A853]/20 rounded-2xl -z-10" />
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-[#7B2D8E]/10 rounded-2xl -z-10" />
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Dermaspace Esthetic & Wellness Centre is a boutique spa that aims to promote skin confidence and improve body wellness. We are committed to bringing our clients the most effective skincare treatments.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Founded in April 2019, we have grown expeditiously and are recognized as one of the best day and esthetic spas in Lagos, Nigeria.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              Our core services include Body treatments, Facial treatments, Waxing, Nail care, and advanced esthetic treatments such as Acne treatment, Chemical Peel, and Microneedling.
            </p>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              Learn More
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
