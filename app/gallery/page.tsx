"use client"

import { useState } from "react"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { X, ChevronLeft, ChevronRight, MapPin, ZoomIn, Grid, LayoutGrid } from "lucide-react"

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
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid')

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
        <section className="py-16 bg-[#7B2D8E] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 border border-white rounded-full" />
            <div className="absolute bottom-10 right-10 w-48 h-48 border border-white rounded-full" />
          </div>
          <div className="max-w-4xl mx-auto px-4 text-center relative">
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white mb-4">
              Our Spaces
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Explore Our Gallery</h1>
            <p className="text-sm text-white/80 max-w-md mx-auto">
              Take a virtual tour of our luxurious spa facilities in Victoria Island and Ikoyi
            </p>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === category
                        ? "bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/25"
                        : "bg-gray-100 text-gray-600 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E]"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              
              {/* View Toggle */}
              <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                >
                  <Grid className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setViewMode('masonry')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'masonry' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                >
                  <LayoutGrid className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {filteredImages.map((image, index) => (
                  <div
                    key={index}
                    onClick={() => openLightbox(index)}
                    className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-gray-100"
                  >
                    {/* Image */}
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    
                    {/* Zoom Icon */}
                    <div className="absolute top-3 right-3 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7B2D8E] rounded-full">
                          <MapPin className="w-2.5 h-2.5 text-white" />
                          <span className="text-[10px] font-medium text-white">{image.category}</span>
                        </span>
                      </div>
                      <p className="text-white text-sm font-semibold">{image.alt}</p>
                    </div>
                    
                    {/* Border glow */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-white/0 group-hover:border-white/30 transition-all duration-300" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4 space-y-3 md:space-y-4">
                {filteredImages.map((image, index) => (
                  <div
                    key={index}
                    onClick={() => openLightbox(index)}
                    className="group relative break-inside-avoid rounded-2xl overflow-hidden cursor-pointer bg-gray-100"
                  >
                    {/* Image */}
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full object-cover transition-all duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Zoom Icon */}
                    <div className="absolute top-3 right-3 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7B2D8E] rounded-full">
                          <MapPin className="w-2.5 h-2.5 text-white" />
                          <span className="text-[10px] font-medium text-white">{image.category}</span>
                        </span>
                      </div>
                      <p className="text-white text-sm font-semibold">{image.alt}</p>
                    </div>
                    
                    {/* Border glow */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-white/0 group-hover:border-white/30 transition-all duration-300" />
                  </div>
                ))}
              </div>
            )}
            
            {/* Image Count */}
            <p className="text-center text-sm text-gray-500 mt-10">
              Showing {filteredImages.length} images {selectedCategory !== "All" && `from ${selectedCategory}`}
            </p>
          </div>
        </section>

        {/* Beautiful Lightbox */}
        {lightboxIndex !== null && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            {/* Prev Button */}
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            
            {/* Image Container */}
            <div 
              className="max-w-6xl max-h-[85vh] mx-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={filteredImages[lightboxIndex].src}
                alt={filteredImages[lightboxIndex].alt}
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />
              
              {/* Image Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent rounded-b-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B2D8E] rounded-full">
                    <MapPin className="w-3 h-3 text-white" />
                    <span className="text-xs font-medium text-white">{filteredImages[lightboxIndex].category}</span>
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-white">{filteredImages[lightboxIndex].alt}</h3>
              </div>
            </div>
            
            {/* Next Button */}
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
            
            {/* Counter */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full">
              <span className="text-white text-sm font-medium">{lightboxIndex + 1} / {filteredImages.length}</span>
            </div>
            
            {/* Thumbnails */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 hidden lg:flex gap-2">
              {filteredImages.slice(Math.max(0, lightboxIndex - 3), Math.min(filteredImages.length, lightboxIndex + 4)).map((img, idx) => {
                const actualIndex = Math.max(0, lightboxIndex - 3) + idx
                return (
                  <button
                    key={actualIndex}
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(actualIndex); }}
                    className={`w-14 h-14 rounded-lg overflow-hidden transition-all ${
                      actualIndex === lightboxIndex 
                        ? 'ring-2 ring-[#7B2D8E] ring-offset-2 ring-offset-black scale-110' 
                        : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
