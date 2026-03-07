'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 100)

    // Minimum display time for animation to complete
    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setIsLoading(false), 500)
    }, 2000)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [])

  if (!isLoading) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#7B2D8E]/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#7B2D8E]/5 rounded-full translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#7B2D8E]/3 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Logo Container with Animations */}
        <div className="relative mb-8">
          {/* Outer Ring - Rotating */}
          <div className="absolute -inset-6 rounded-full border-2 border-dashed border-[#7B2D8E]/20 animate-spin" style={{ animationDuration: '8s' }} />
          
          {/* Middle Ring - Pulsing */}
          <div className="absolute -inset-4 rounded-full border border-[#7B2D8E]/30 animate-pulse" />
          
          {/* Inner Glow */}
          <div className="absolute -inset-2 rounded-full bg-[#7B2D8E]/10 animate-pulse" style={{ animationDuration: '1.5s' }} />
          
          {/* Logo */}
          <div className="relative w-24 h-24 animate-float">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp"
              alt="Dermaspace Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          
          {/* Sparkle Effects */}
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-[#7B2D8E] rounded-full animate-ping opacity-60" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#7B2D8E] rounded-full animate-ping opacity-40" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Brand Name with Letter Animation */}
        <div className="mb-6 overflow-hidden">
          <h1 className="text-2xl md:text-3xl font-bold text-[#7B2D8E] tracking-wide">
            {'Dermaspace'.split('').map((letter, index) => (
              <span
                key={index}
                className="inline-block animate-letter-bounce"
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                {letter}
              </span>
            ))}
          </h1>
          <p className="text-xs text-gray-500 text-center mt-1 tracking-widest uppercase animate-fade-in" style={{ animationDelay: '0.5s' }}>
            Esthetic & Wellness Centre
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Loading Text */}
        <p className="text-xs text-gray-400 animate-pulse">
          Loading your wellness experience...
        </p>
      </div>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes letter-bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-letter-bounce {
          animation: letter-bounce 0.6s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}
