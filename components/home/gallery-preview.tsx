'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react'

const galleryItems = [
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg",
    alt: "The Grand Reception",
    location: "Victoria Island",
    description: "Where your journey to relaxation begins. Our signature illuminated Dermaspace sign welcomes you into a world of luxury and tranquility.",
    category: "Reception"
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg",
    alt: "The Purple Lounge",
    location: "Ikoyi",
    description: "Sink into our plush purple velvet seating as you await your treatment. Comfort redefined in every detail.",
    category: "Lounge"
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg",
    alt: "The Amber Stairway",
    location: "Victoria Island",
    description: "Warm wood tones and cascading LED lights guide you through our multi-level sanctuary of wellness.",
    category: "Interior"
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%288%29-7srs2qstY6dOLqJY5AtU5ZfiIrAHDS.jpg",
    alt: "The Nail Art Studio",
    location: "Victoria Island",
    description: "Where artistry meets precision. Our dedicated nail studio features custom wall art and luxurious purple seating.",
    category: "Studio"
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed-1B2YmB1N9JklXqCJgRwJNxRBN10kKZ.jpg",
    alt: "The Treatment Sanctuary",
    location: "Ikoyi",
    description: "State-of-the-art equipment meets serene ambiance. Every treatment room is designed for your ultimate comfort.",
    category: "Treatment"
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%286%29-f9QvkWyo3KI3xcr1QfDkGxiU2DIgqJ.jpg",
    alt: "The Couples Suite",
    location: "Ikoyi",
    description: "Share the experience of relaxation with someone special in our intimate dual treatment room.",
    category: "Treatment"
  },
]

export default function GalleryPreview() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isAutoPlaying && !isHovered) {
      intervalRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % galleryItems.length)
      }, 5000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isAutoPlaying, isHovered])

  const goToSlide = (index: number) => {
    setActiveIndex(index)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % galleryItems.length)
  }

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length)
  }

  return (
    <section className="py-16 md:py-24 bg-[#0A0A0A] overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-12 bg-gradient-to-r from-[#7B2D8E] to-pink-500" />
              <span className="text-[#7B2D8E] text-sm font-medium tracking-widest uppercase">Our Spaces</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              A Visual Tour of<br />
              <span className="bg-gradient-to-r from-[#7B2D8E] via-pink-500 to-[#7B2D8E] bg-clip-text text-transparent">
                Pure Luxury
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all text-sm"
            >
              {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isAutoPlaying ? 'Pause' : 'Play'}
            </button>
            <Link 
              href="/gallery"
              className="group flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-semibold rounded-full hover:bg-[#7B2D8E] hover:text-white transition-all duration-300"
            >
              View All
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Main Gallery Display */}
        <div 
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Featured Image */}
          <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden bg-gray-900">
            {galleryItems.map((item, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-1000 ease-out ${
                  index === activeIndex 
                    ? 'opacity-100 scale-100' 
                    : 'opacity-0 scale-105'
                }`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="100vw"
                  quality={100}
                  unoptimized
                  priority={index === 0}
                  className="object-cover"
                />
                {/* Cinematic Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              </div>
            ))}

            {/* Content Overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 lg:p-14">
              <div className="max-w-2xl">
                {/* Category Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full mb-4 border border-white/20">
                  <div className="w-2 h-2 rounded-full bg-[#7B2D8E] animate-pulse" />
                  <span className="text-white/90 text-xs font-medium tracking-wider uppercase">
                    {galleryItems[activeIndex].location} • {galleryItems[activeIndex].category}
                  </span>
                </div>
                
                {/* Title with Animation */}
                <h3 
                  key={activeIndex}
                  className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 animate-fade-in-up"
                >
                  {galleryItems[activeIndex].alt}
                </h3>
                
                {/* Description */}
                <p 
                  key={`desc-${activeIndex}`}
                  className="text-white/80 text-sm md:text-base lg:text-lg leading-relaxed max-w-xl animate-fade-in-up animation-delay-100"
                >
                  {galleryItems[activeIndex].description}
                </p>
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={goPrev}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
              style={{ opacity: isHovered ? 1 : 0 }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
              style={{ opacity: isHovered ? 1 : 0 }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Slide Counter */}
            <div className="absolute top-6 right-6 md:top-10 md:right-10 flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full">
              <span className="text-white font-bold text-lg">{String(activeIndex + 1).padStart(2, '0')}</span>
              <span className="text-white/50">/</span>
              <span className="text-white/50 text-sm">{String(galleryItems.length).padStart(2, '0')}</span>
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="mt-6 flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {galleryItems.map((item, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`relative flex-shrink-0 w-24 md:w-32 lg:w-40 aspect-[4/3] rounded-xl overflow-hidden transition-all duration-300 ${
                  index === activeIndex 
                    ? 'ring-2 ring-[#7B2D8E] ring-offset-2 ring-offset-[#0A0A0A] scale-105' 
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="160px"
                  quality={80}
                  unoptimized
                  className="object-cover"
                />
                {index === activeIndex && (
                  <div className="absolute inset-0 bg-[#7B2D8E]/20" />
                )}
              </button>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 flex gap-2">
            {galleryItems.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="flex-1 h-1 rounded-full overflow-hidden bg-white/10"
              >
                <div 
                  className={`h-full bg-gradient-to-r from-[#7B2D8E] to-pink-500 transition-all duration-300 ${
                    index === activeIndex 
                      ? 'w-full' 
                      : index < activeIndex 
                        ? 'w-full opacity-50' 
                        : 'w-0'
                  }`}
                  style={index === activeIndex && isAutoPlaying && !isHovered ? {
                    animation: 'progress 5s linear forwards'
                  } : {}}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Info Strip */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div className="text-center md:text-left">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">2</div>
            <div className="text-white/50 text-sm mt-1">Stunning Locations</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">10+</div>
            <div className="text-white/50 text-sm mt-1">Treatment Rooms</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">24+</div>
            <div className="text-white/50 text-sm mt-1">Gallery Photos</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#7B2D8E] to-pink-500 bg-clip-text text-transparent">5 Star</div>
            <div className="text-white/50 text-sm mt-1">Experience Awaits</div>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animation-delay-100 {
          animation-delay: 0.1s;
          opacity: 0;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  )
}
