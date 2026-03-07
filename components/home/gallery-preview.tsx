'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Camera, Sparkles, MapPin } from 'lucide-react'

const galleryItems = [
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg",
    alt: "Our Signature Reception",
    location: "Victoria Island",
    description: "Where luxury meets warmth - our illuminated reception welcomes you to a world of relaxation",
    span: "col-span-2 row-span-2",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg",
    alt: "Elegant Lounge",
    location: "Ikoyi",
    description: "Sink into comfort in our plush purple seating area",
    span: "col-span-1 row-span-1",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%288%29-7srs2qstY6dOLqJY5AtU5ZfiIrAHDS.jpg",
    alt: "Nail Art Studio",
    location: "Victoria Island",
    description: "Artistry meets precision in our dedicated nail care space",
    span: "col-span-1 row-span-1",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed-1B2YmB1N9JklXqCJgRwJNxRBN10kKZ.jpg",
    alt: "Treatment Sanctuary",
    location: "Ikoyi",
    description: "State-of-the-art equipment meets serene ambiance",
    span: "col-span-1 row-span-1",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg",
    alt: "Grand Lobby",
    location: "Victoria Island",
    description: "Warm wood tones and ambient lighting set the mood for your visit",
    span: "col-span-1 row-span-2",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%286%29-f9QvkWyo3KI3xcr1QfDkGxiU2DIgqJ.jpg",
    alt: "Couples Treatment Suite",
    location: "Ikoyi",
    description: "Share the experience with a loved one in our dual treatment room",
    span: "col-span-2 row-span-1",
  },
]

export default function GalleryPreview() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E]/5 rounded-full mb-6">
            <Camera className="w-4 h-4 text-[#7B2D8E]" />
            <span className="text-sm font-medium text-[#7B2D8E]">Visual Journey</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Step Inside <span className="text-[#7B2D8E]">Dermaspace</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Experience the elegance and tranquility of our spaces before you visit. 
            Every corner is designed to make you feel pampered and at peace.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[200px] md:auto-rows-[220px]">
          {galleryItems.map((item, index) => (
            <div
              key={index}
              className={`group relative rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer ${item.span}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Image */}
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={100}
                unoptimized
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 transition-opacity duration-500 ${
                hoveredIndex === index 
                  ? 'bg-gradient-to-t from-[#7B2D8E]/90 via-[#7B2D8E]/40 to-transparent opacity-100'
                  : 'bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70'
              }`} />
              
              {/* Location Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transform -translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <MapPin className="w-3 h-3 text-[#7B2D8E]" />
                <span className="text-xs font-medium text-gray-800">{item.location}</span>
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <div className={`transform transition-all duration-500 ${
                  hoveredIndex === index ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-80'
                }`}>
                  <h3 className="text-white font-bold text-base md:text-lg mb-1 drop-shadow-lg">
                    {item.alt}
                  </h3>
                  <p className={`text-white/90 text-xs md:text-sm leading-relaxed transition-all duration-300 ${
                    hoveredIndex === index ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}>
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Sparkle Effect on Hover */}
              {hoveredIndex === index && (
                <div className="absolute top-4 right-4">
                  <Sparkles className="w-5 h-5 text-white/80 animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="mt-12 grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-[#7B2D8E]">2</div>
            <div className="text-xs md:text-sm text-gray-500">Premium Locations</div>
          </div>
          <div className="text-center border-x border-gray-100">
            <div className="text-2xl md:text-3xl font-bold text-[#7B2D8E]">10+</div>
            <div className="text-xs md:text-sm text-gray-500">Treatment Rooms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-[#7B2D8E]">100%</div>
            <div className="text-xs md:text-sm text-gray-500">Relaxation Guaranteed</div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link 
            href="/gallery"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-[#7B2D8E] text-white font-semibold rounded-full hover:bg-[#6B2D7E] transition-all duration-300 hover:shadow-xl hover:shadow-[#7B2D8E]/25"
          >
            <span>Explore Full Gallery</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-gray-500 text-sm mt-4">
            View all 24+ photos from both locations
          </p>
        </div>
      </div>
    </section>
  )
}
