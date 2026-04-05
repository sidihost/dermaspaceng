'use client'

import { useEffect, useState } from 'react'

interface EasterEgg {
  id: number
  left: number
  delay: number
  duration: number
  size: number
  color: string
  pattern: number
}

const eggColors = [
  '#FFB6C1', // Light pink
  '#98D8C8', // Mint green
  '#F7DC6F', // Soft yellow
  '#BB8FCE', // Lavender
  '#85C1E9', // Sky blue
  '#F8B500', // Golden
  '#7B2D8E', // Brand purple
]

export default function EasterEffect() {
  const [eggs, setEggs] = useState<EasterEgg[]>([])
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Create initial eggs
    const initialEggs: EasterEgg[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 6,
      size: 16 + Math.random() * 12,
      color: eggColors[Math.floor(Math.random() * eggColors.length)],
      pattern: Math.floor(Math.random() * 4),
    }))
    setEggs(initialEggs)

    // Auto-hide after 30 seconds to not be too distracting
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 30000)

    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {eggs.map((egg) => (
        <div
          key={egg.id}
          className="absolute animate-fall"
          style={{
            left: `${egg.left}%`,
            animationDelay: `${egg.delay}s`,
            animationDuration: `${egg.duration}s`,
          }}
        >
          <svg
            width={egg.size}
            height={egg.size * 1.3}
            viewBox="0 0 24 32"
            className="animate-wobble"
            style={{
              animationDelay: `${egg.delay * 0.5}s`,
            }}
          >
            {/* Egg shape */}
            <ellipse
              cx="12"
              cy="18"
              rx="10"
              ry="13"
              fill={egg.color}
              stroke="white"
              strokeWidth="0.5"
            />
            {/* Patterns */}
            {egg.pattern === 0 && (
              <>
                <path d="M4 14 Q12 10 20 14" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
                <path d="M4 20 Q12 16 20 20" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
              </>
            )}
            {egg.pattern === 1 && (
              <>
                <circle cx="8" cy="14" r="2" fill="white" opacity="0.6" />
                <circle cx="16" cy="14" r="2" fill="white" opacity="0.6" />
                <circle cx="12" cy="20" r="2" fill="white" opacity="0.6" />
                <circle cx="8" cy="24" r="1.5" fill="white" opacity="0.6" />
                <circle cx="16" cy="24" r="1.5" fill="white" opacity="0.6" />
              </>
            )}
            {egg.pattern === 2 && (
              <>
                <path d="M6 12 L10 16 L6 20" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
                <path d="M18 12 L14 16 L18 20" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
              </>
            )}
            {egg.pattern === 3 && (
              <>
                <rect x="5" y="12" width="14" height="3" rx="1" fill="white" opacity="0.5" />
                <rect x="5" y="18" width="14" height="3" rx="1" fill="white" opacity="0.5" />
                <rect x="5" y="24" width="14" height="2" rx="1" fill="white" opacity="0.5" />
              </>
            )}
          </svg>
        </div>
      ))}

      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-4 right-4 pointer-events-auto bg-white/80 backdrop-blur-sm text-gray-600 rounded-full p-2 hover:bg-white transition-colors shadow-lg"
        aria-label="Close Easter effect"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes wobble {
          0%, 100% {
            transform: rotate(-15deg);
          }
          50% {
            transform: rotate(15deg);
          }
        }
        
        .animate-fall {
          animation: fall linear infinite;
        }
        
        .animate-wobble {
          animation: wobble 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
