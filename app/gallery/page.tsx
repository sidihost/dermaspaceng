"use client"

import { useState } from "react"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { X, ChevronLeft, ChevronRight, MapPin } from "lucide-react"

const galleryImages = [
  // Victoria Island
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg", alt: "VI Reception", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg", alt: "VI Lobby", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2813%29-3ARzEcEW2Bn2R4yMKrUaohoV3DaFct.jpg", alt: "VI Lobby Area", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2814%29-Ah7kChqKLLYSIrv2k7TqmQ11E424mH.jpg", alt: "VI Reception Floor", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%288%29-7srs2qstY6dOLqJY5AtU5ZfiIrAHDS.jpg", alt: "VI Nail Station", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%289%29-Nt4ldllYbTN5lMVxwZYQ9Lb2vTgxB1.jpg", alt: "VI Treatment Room", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2810%29-ricU7Xkvb3qtQvdn6XRwTUFco8ZQWW.jpg", alt: "VI Treatment Entrance", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2811%29-PxOYury3WDyxhPQkF5P1zxryCDeUzW.jpg", alt: "VI Massage Room", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2815%29-YeaDpqhDMkIFkzfjMH2f60puI7CeFr.jpg", alt: "VI Building", category: "Victoria Island" },
  // Ikoyi
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg", alt: "Ikoyi Reception", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%284%29-mZaq51DsDVVT7BWQbPsKXjeDJytDMS.jpg", alt: "Ikoyi Lounge", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed-1B2YmB1N9JklXqCJgRwJNxRBN10kKZ.jpg", alt: "Ikoyi Treatment Room", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%286%29-f9QvkWyo3KI3xcr1QfDkGxiU2DIgqJ.jpg", alt: "Ikoyi Couples Suite", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%283%29-bBAama9gEEossSGJlIQIZAwphAAG5Q.jpg", alt: "Ikoyi Entrance", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%282%29-4KSqSW4Rhko2I1OrFwm6L4EHhoDkf4.jpg", alt: "Ikoyi Products Display", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%281%29-FlXVXMeWQxa3Ps9R0k3ly8RE4TjKfz.jpg", alt: "Ikoyi Equipment Room", category: "Ikoyi" },
]

const categories = ["All", "Victoria Island", "Ikoyi"]

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
        <section className="py-16 bg-[#7B2D8E]">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-white mb-3">Our Gallery</h1>
            <p className="text-sm text-white/80 max-w-md mx-auto">
              Explore our beautiful spaces across Victoria Island and Ikoyi
            </p>
          </div>
        </section>

        {/* Filter */}
        <section className="py-6 bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
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
        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {filteredImages.map((image, index) => (
                <div
                  key={index}
                  onClick={() => openLightbox(index)}
                  className="break-inside-avoid group relative rounded-xl overflow-hidden cursor-pointer"
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-center gap-1 text-white/80 text-[10px] mb-1">
                      <MapPin className="w-2.5 h-2.5" />
                      {image.category}
                    </div>
                    <p className="text-white text-xs font-medium">{image.alt}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Image Count */}
            <p className="text-center text-sm text-gray-500 mt-8">
              Showing {filteredImages.length} images
            </p>
          </div>
        </section>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 p-2 text-white/70 hover:text-white"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            
            <div 
              className="max-w-5xl max-h-[85vh] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={filteredImages[lightboxIndex].src}
                alt={filteredImages[lightboxIndex].alt}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            </div>
            
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 p-2 text-white/70 hover:text-white"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
            
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white text-sm font-medium">{filteredImages[lightboxIndex].alt}</p>
              <p className="text-white/60 text-xs">{lightboxIndex + 1} / {filteredImages.length}</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
