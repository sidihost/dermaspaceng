'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ChristmasLogoHat } from '@/components/shared/christmas-logo-hat'

const PRELOADER_SESSION_KEY = 'ds_preloader_seen'

export default function Preloader() {
  const pathname = usePathname()
  const skipPreloader =
    Boolean(pathname?.startsWith('/offline')) ||
    Boolean(pathname?.startsWith('/maintenance')) ||
    Boolean(pathname?.startsWith('/dashboard')) ||
    Boolean(pathname?.startsWith('/admin')) ||
    Boolean(pathname?.startsWith('/staff'))

  const [isLoading, setIsLoading] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (skipPreloader) {
      setIsLoading(false)
      return
    }
    let alreadySeen = false
    try {
      alreadySeen = window.sessionStorage.getItem(PRELOADER_SESSION_KEY) === '1'
      if (!alreadySeen) {
        window.sessionStorage.setItem(PRELOADER_SESSION_KEY, '1')
      }
    } catch {
      alreadySeen = true
    }
    if (alreadySeen) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const fade = window.setTimeout(() => setFadeOut(true), 450)
    const hide = window.setTimeout(() => setIsLoading(false), 750)
    return () => {
      window.clearTimeout(fade)
      window.clearTimeout(hide)
    }
  }, [skipPreloader])

  if (!isLoading || skipPreloader) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-300 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center px-6">
        <div className="relative inline-block">
          <ChristmasLogoHat className="w-7 h-7 -top-3.5 left-0 sm:w-8 sm:h-8 sm:-top-4 sm:left-0" />
          <Image
            src="/images/dermaspace-logo.png"
            alt="Dermaspace Esthetic And Wellness Centre"
            width={220}
            height={45}
            className="h-11 sm:h-12 w-auto object-contain"
            priority
          />
        </div>

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
          animation: loading-bar 0.65s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
