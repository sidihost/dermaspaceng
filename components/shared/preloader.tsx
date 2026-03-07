'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setIsLoading(false), 600)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (!isLoading) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-600 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        {/* Logo with subtle animation */}
        <div className="relative">
          {/* Outer ring - slow rotation */}
          <div className="absolute inset-0 w-32 h-32 -m-4">
            <svg viewBox="0 0 100 100" className="w-full h-full animate-spin" style={{ animationDuration: '8s' }}>
              <circle 
                cx="50" 
                cy="50" 
                r="48" 
                fill="none" 
                stroke="#7B2D8E" 
                strokeWidth="0.5"
                strokeDasharray="8 4"
                opacity="0.3"
              />
            </svg>
          </div>
          
          {/* Logo container */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp"
              alt="Dermaspace"
              width={80}
              height={80}
              className="object-contain animate-pulse"
              style={{ animationDuration: '2s' }}
              priority
            />
          </div>
        </div>

        {/* Brand name */}
        <p className="mt-6 text-lg font-medium text-[#7B2D8E] tracking-wide">
          Dermaspace
        </p>

        {/* Loading indicator - three dots */}
        <div className="flex items-center gap-1.5 mt-4">
          <span className="w-1.5 h-1.5 bg-[#7B2D8E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-[#7B2D8E] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-[#7B2D8E] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
