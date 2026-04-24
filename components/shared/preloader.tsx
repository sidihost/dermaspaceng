'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Total visible time = 1100ms (was 2200ms). The preloader is
    // shown on every navigation, so 2.2s felt like dead time on
    // repeat visits. 1.1s + a 350ms cross-fade still gives the
    // logo enough breathing room to register as a brand moment
    // without making the site feel slow.
    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setIsLoading(false), 350)
    }, 1100)

    return () => clearTimeout(timer)
  }, [])

  if (!isLoading) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-300 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        {/* Logo — trimmed from h-14 → h-11 so the splash feels
            proportional on phones (smaller viewports were getting a
            disproportionately large mark). */}
        <div className="relative">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
            alt="Dermaspace"
            width={160}
            height={52}
            className="h-11 w-auto"
            priority
          />
        </div>

        {/* Loading bar — pulled closer to the logo (was mt-8) to
            tighten the splash overall and dropped to a 36-wide rail
            so it scales with the smaller logo above. */}
        <div className="mt-5 w-36 h-0.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7B2D8E] rounded-full animate-loading-bar"
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 1s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
