"use client"

import { useState } from "react"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

const galleryImages = [
  // Victoria Island Location Images
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg",
    alt: "VI Reception with Dermaspace Sign",
    category: "Victoria Island",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg",
    alt: "VI Lobby with Staircase",
    category: "Victoria Island",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2813%29-3ARzEcEW2Bn2R4yMKrUaohoV3DaFct.jpg",
    alt: "VI Lobby Area",
    category: "Victoria Island",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2814%29-Ah7kChqKLLYSIrv2k7TqmQ11E424mH.jpg",
    alt: "VI Reception Floor",
    category: "Victoria Island",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%288%29-7srs2qstY6dOLqJY5AtU5ZfiIrAHDS.jpg",
    alt: "VI Nail Station",
    category: "Victoria Island",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%289%29-Nt4ldllYbTN5lMVxwZYQ9Lb2vTgxB1.jpg",
    alt: "VI Treatment Room",
    category: "Victoria Island",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2810%29-ricU7Xkvb3qtQvdn6XRwTUFco8ZQWW.jpg",
    alt: "VI Treatment Room Entrance",
    category: "Victoria Island",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2811%29-PxOYury3WDyxhPQkF5P1zxryCDeUzW.jpg",
    alt: "VI Massage Room",
    category: "Victoria Island",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2815%29-YeaDpqhDMkIFkzfjMH2f60puI7CeFr.jpg",
    alt: "VI Building Exterior",
    category: "Victoria Island",
  },
  // Ikoyi Location Images
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg",
    alt: "Ikoyi Reception Area",
    category: "Ikoyi",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%284%29-mZaq51DsDVVT7BWQbPsKXjeDJytDMS.jpg",
    alt: "Ikoyi Lounge",
    category: "Ikoyi",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed-1B2YmB1N9JklXqCJgRwJNxRBN10kKZ.jpg",
    alt: "Ikoyi Treatment Room",
    category: "Ikoyi",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%286%29-f9QvkWyo3KI3xcr1QfDkGxiU2DIgqJ.jpg",
    alt: "Ikoyi Dual Treatment Room",
    category: "Ikoyi",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%283%29-bBAama9gEEossSGJlIQIZAwphAAG5Q.jpg",
    alt: "Ikoyi Entrance Area",
    category: "Ikoyi",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%282%29-4KSqSW4Rhko2I1OrFwm6L4EHhoDkf4.jpg",
    alt: "Ikoyi Product Display",
    category: "Ikoyi",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%281%29-FlXVXMeWQxa3Ps9R0k3ly8RE4TjKfz.jpg",
    alt: "Ikoyi Equipment Area",
    category: "Ikoyi",
  },
  // Original Images
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp",
    alt: "Dermaspace Spa Interior",
    category: "Interior",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6468-2-2048x1463.jpg-1024x732-1-dKeUu4w0K7uutGPH5gmeN7nXrcuOu2.webp",
    alt: "Facial Treatment Room",
    category: "Treatments",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp",
    alt: "Professional Facial",
    category: "Treatments",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp",
    alt: "Body Treatment",
    category: "Treatments",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp",
    alt: "Nail Care Service",
    category: "Services",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp",
    alt: "Waxing Treatment",
    category: "Services",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/85157438_9aab_3.jpg-1YOii0Tsg7gHL94IxkJU0Ppoi3pRHa.webp",
    alt: "CEO Portrait",
    category: "Team",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/franca-1-ZLFTvxIeaKIywWjr4amphoEGwfmuOe.webp",
    alt: "Co-founder Portrait",
    category: "Team",
  },
]

const categories = ["All", "Ikoyi", "Victoria Island", "Interior", "Treatments", "Services", "Team"]

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const filteredImages = selectedCategory === "All" 
    ? galleryImages 
    : galleryImages.filter(img => img.category === selectedCategory)

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const nextImage = () => setLightboxIndex(prev => prev !== null ? (prev + 1) % filteredImages.length : null)
  const prevImage = () => setLightboxIndex(prev => prev !== null ? (prev - 1 + filteredImages.length) % filteredImages.length : null)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FDFBF9]">
        {/* Hero */}
        <section className="py-20 bg-[#7B2D8E]">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-4">
              Our Space
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Gallery
            </h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-0.5 bg-white/30" />
              <div className="w-2 h-0.5 bg-white/50" />
            </div>
            <p className="text-white/80 max-w-lg mx-auto">
              Take a visual journey through Dermaspace
            </p>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-8 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? "bg-[#7B2D8E] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image, index) => (
                <div
                  key={index}
                  onClick={() => openLightbox(index)}
                  className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    quality={100}
                    unoptimized
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white font-semibold text-sm drop-shadow-lg">{image.alt}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-xs">{image.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            
            <button
              onClick={prevImage}
              className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
            
            <div className="relative w-full max-w-5xl aspect-[4/3] mx-4">
              <Image
                src={filteredImages[lightboxIndex].src}
                alt={filteredImages[lightboxIndex].alt}
                fill
                sizes="100vw"
                quality={100}
                priority
                unoptimized
                className="object-contain"
              />
            </div>
            
            <button
              onClick={nextImage}
              className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronRight className="w-10 h-10" />
            </button>
            
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white font-medium">{filteredImages[lightboxIndex].alt}</p>
              <p className="text-white/60 text-sm">{lightboxIndex + 1} / {filteredImages.length}</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
