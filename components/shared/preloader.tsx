'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const fade = window.setTimeout(() => setFadeOut(true), 1700)
    const hide = window.setTimeout(() => setIsLoading(false), 2200)
    return () => {
      window.clearTimeout(fade)
      window.clearTimeout(hide)
    }
  }, [])

  if (!isLoading) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center px-6">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
          alt="Dermaspace"
          width={180}
          height={60}
          className="h-12 sm:h-14 w-auto"
          priority
        />

        <div className="mt-5 w-44 h-0.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#7B2D8E] rounded-full animate-loading-bar" />
        </div>

        <span className="sr-only">Loading Dermaspace</span>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
