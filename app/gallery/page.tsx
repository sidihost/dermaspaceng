"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { X, ChevronLeft, ChevronRight, MapPin, ZoomIn } from "lucide-react"

const galleryImages = [
  // Victoria Island
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg", alt: "Reception Area", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg", alt: "Lobby", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2813%29-3ARzEcEW2Bn2R4yMKrUaohoV3DaFct.jpg", alt: "Lobby Lounge", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2814%29-Ah7kChqKLLYSIrv2k7TqmQ11E424mH.jpg", alt: "Reception Desk", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%288%29-7srs2qstY6dOLqJY5AtU5ZfiIrAHDS.jpg", alt: "Nail Station", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%289%29-Nt4ldllYbTN5lMVxwZYQ9Lb2vTgxB1.jpg", alt: "Treatment Room", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2810%29-ricU7Xkvb3qtQvdn6XRwTUFco8ZQWW.jpg", alt: "Treatment Suite", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2811%29-PxOYury3WDyxhPQkF5P1zxryCDeUzW.jpg", alt: "Massage Room", category: "Victoria Island" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2815%29-YeaDpqhDMkIFkzfjMH2f60puI7CeFr.jpg", alt: "Building Exterior", category: "Victoria Island" },
  // Ikoyi
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3360.JPG-bJ57ZV3Wl1GImeuHYSeNTlnS0GUCVs.jpeg", alt: "Reception", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3359.JPG-L2ErLSUMlWNQgHhioWe6yVPM9XVb6z.jpeg", alt: "Reception Desk", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3358.JPG-v11vKVvcuEj7al4KIOnMq1wd8H5dic.jpeg", alt: "Lounge Area", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3365.JPG-BaeXn9oZhcXvqPjAF7UXZ5xMoALDXx.jpeg", alt: "Waiting Area", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3366.JPG-OPbCFGtQYVb7tLU5XPfzg9RPXZ8Kzi.jpeg", alt: "Pedicure Lounge", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3371.JPG-KIOf6sbksYGE8PoJuir8tfR9EQfobA.jpeg", alt: "Treatment Room", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3369.JPG-Tv3PEg3TqjOgEem6DAtDw5Pk4MrqA5.jpeg", alt: "Massage Suite", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3363.JPG-xnBAz6JBg6O8ijVFoxk3dA3tPQHfSn.jpeg", alt: "Entrance", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3362.JPG-I2CGV9YYsnmZzBjUrAD51v0FdJe9yc.jpeg", alt: "Interior Details", category: "Ikoyi" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3367.JPG-IvWEKkKXQ7GZmRiUaLIUSeoLrPTLIo.jpeg", alt: "Storage Area", category: "Ikoyi" },
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'ArrowRight') nextImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex])

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-[#7B2D8E] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Our Gallery
            </h1>
            <p className="text-white/80 max-w-xl mx-auto">
              Take a virtual tour of our luxurious spa facilities across Lagos
            </p>
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="py-4 bg-white border-b border-gray-100 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? "bg-[#7B2D8E] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredImages.map((image, index) => (
                <div
                  key={index}
                  onClick={() => openLightbox(index)}
                  className="group relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer bg-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Image */}
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/90 via-[#7B2D8E]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Zoom Icon */}
                  <div className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0 shadow-lg">
                    <ZoomIn className="w-4 h-4 text-[#7B2D8E]" />
                  </div>
                  
                  {/* Bottom Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-center gap-1.5 mb-2">
                      <MapPin className="w-3 h-3 text-white" />
                      <span className="text-xs font-medium text-white/80">{image.category}</span>
                    </div>
                    <p className="text-white font-semibold">{image.alt}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Results Count */}
            <div className="text-center mt-12">
              <p className="text-gray-500">
                Showing <span className="font-semibold text-[#7B2D8E]">{filteredImages.length}</span> images
                {selectedCategory !== "All" && <span> from <span className="font-semibold">{selectedCategory}</span></span>}
              </p>
            </div>
          </div>
        </section>

        {/* Fullscreen Lightbox Modal */}
        {lightboxIndex !== null && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
            onClick={closeLightbox}
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Image Counter */}
            <div className="absolute top-4 left-4 z-20 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
              <span className="text-white text-sm font-medium">
                {lightboxIndex + 1} / {filteredImages.length}
              </span>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>

            {/* Main Image */}
            <div 
              className="relative w-full h-full max-w-5xl max-h-[80vh] mx-4 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full animate-in zoom-in-95 duration-300">
                <Image
                  src={filteredImages[lightboxIndex].src}
                  alt={filteredImages[lightboxIndex].alt}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 pb-8">
              <div className="max-w-5xl mx-auto text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B2D8E] rounded-full">
                    <MapPin className="w-3 h-3 text-white" />
                    <span className="text-xs font-medium text-white">{filteredImages[lightboxIndex].category}</span>
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white">
                  {filteredImages[lightboxIndex].alt}
                </h3>
                
                {/* Thumbnail Strip */}
                <div className="flex items-center justify-center gap-2 mt-6 overflow-x-auto pb-2 px-4">
                  {filteredImages.map((item, index) => (
                    <button
                      key={index}
                      onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                      className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 ${
                        index === lightboxIndex 
                          ? 'ring-2 ring-[#7B2D8E] ring-offset-2 ring-offset-black scale-110' 
                          : 'opacity-40 hover:opacity-70'
                      }`}
                    >
                      <Image
                        src={item.src}
                        alt={item.alt}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
