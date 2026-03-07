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
    }, 1800)

    return () => clearTimeout(timer)
  }, [])

  if (!isLoading) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-all duration-600 ${
        fadeOut ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* Clean minimal background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#7B2D8E]/3 rounded-full blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Logo with subtle animation */}
        <div className="relative mb-6">
          {/* Subtle outer ring */}
          <div 
            className="absolute -inset-8 rounded-full border border-[#7B2D8E]/10"
            style={{
              animation: 'pulse-ring 2s ease-in-out infinite'
            }}
          />
          
          {/* Logo container */}
          <div 
            className="relative w-20 h-20 flex items-center justify-center"
            style={{
              animation: 'subtle-float 3s ease-in-out infinite'
            }}
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp"
              alt="Dermaspace"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Brand text - clean and minimal */}
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#7B2D8E] tracking-wide mb-1">
            Dermaspace
          </h1>
          <p className="text-[10px] text-gray-400 tracking-[0.2em] uppercase">
            Esthetic & Wellness
          </p>
        </div>

        {/* Minimal loading indicator */}
        <div className="mt-8 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]"
              style={{
                animation: 'dot-pulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.05); opacity: 0.1; }
        }
        
        @keyframes dot-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
