'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Smooth progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 2
      })
    }, 30)

    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setIsLoading(false), 500)
    }, 1600)

    return () => {
      clearTimeout(timer)
      clearInterval(progressInterval)
    }
  }, [])

  if (!isLoading) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-all duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Clean background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-[#7B2D8E]/5 to-transparent rounded-full" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Logo - centered and clean */}
        <div className="relative mb-8">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp"
              alt="Dermaspace"
              width={96}
              height={96}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Progress bar - sleek and minimal */}
        <div className="w-48 h-0.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#7B2D8E] rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading text */}
        <p className="mt-4 text-xs text-gray-400 tracking-widest uppercase">
          Loading
        </p>
      </div>
    </div>
  )
}
