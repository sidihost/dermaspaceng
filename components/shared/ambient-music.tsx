'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

// Royalty-free spa/relaxation music URLs
const MUSIC_URLS = [
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
  'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3',
]

export default function AmbientMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const pathname = usePathname()

  const musicPages = ['/', '/services', '/about', '/gallery', '/contact', '/booking', '/packages']
  const shouldPlayMusic = musicPages.some(page => pathname === page || pathname.startsWith(page + '/'))

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.loop = true
      audioRef.current.volume = 0.12
      audioRef.current.preload = 'auto'
      audioRef.current.src = MUSIC_URLS[0]
      audioRef.current.onerror = () => {
        if (audioRef.current) {
          audioRef.current.src = MUSIC_URLS[1]
        }
      }
    }

    const tryAutoPlay = async () => {
      if (audioRef.current && shouldPlayMusic) {
        try {
          await audioRef.current.play()
          setIsPlaying(true)
        } catch {
          setIsPlaying(false)
        }
      }
      setIsVisible(true)
    }

    tryAutoPlay()
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!shouldPlayMusic && isPlaying) {
      audio.pause()
      setIsPlaying(false)
    }
  }, [shouldPlayMusic, isPlaying])

  const toggleMusic = async () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch {
        // Autoplay blocked
      }
    }
  }

  if (!shouldPlayMusic || !isVisible) return null

  return (
    <button
      onClick={toggleMusic}
      className="fixed bottom-24 md:bottom-6 right-4 z-40 group"
      aria-label={isPlaying ? 'Pause music' : 'Play music'}
    >
      {/* Floating card design */}
      <div className="relative">
        {/* Multi-layer shadow for depth */}
        <div className="absolute inset-0 rounded-2xl bg-[#7B2D8E]/20 blur-xl transform translate-y-2" />
        <div className="absolute inset-0 rounded-2xl bg-black/10 blur-md transform translate-y-1" />
        
        {/* Main container */}
        <div className={`
          relative flex items-center gap-3 px-4 py-3 rounded-2xl
          backdrop-blur-xl border transition-all duration-500
          group-hover:scale-[1.02] group-active:scale-[0.98]
          ${isPlaying 
            ? 'bg-gradient-to-r from-[#7B2D8E] via-[#8B3D9E] to-[#6B1D7E] border-white/20 shadow-[0_8px_32px_rgba(123,45,142,0.4)]' 
            : 'bg-white/95 border-gray-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)]'
          }
        `}>
          {/* Animated equalizer bars */}
          <div className="flex items-end gap-[3px] h-5 w-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`
                  w-[3px] rounded-full transition-all duration-300
                  ${isPlaying 
                    ? 'bg-white' 
                    : 'bg-gray-300 group-hover:bg-[#7B2D8E]'
                  }
                `}
                style={{
                  height: isPlaying ? undefined : '6px',
                  animation: isPlaying 
                    ? `soundwave 0.6s ease-in-out infinite` 
                    : 'none',
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
          
          {/* Text label */}
          <span className={`
            text-sm font-medium transition-colors duration-300
            ${isPlaying ? 'text-white' : 'text-gray-600 group-hover:text-[#7B2D8E]'}
          `}>
            {isPlaying ? 'Playing' : 'Play'}
          </span>
          
          {/* Play/Pause icon */}
          <div className={`
            w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300
            ${isPlaying 
              ? 'bg-white/20' 
              : 'bg-[#7B2D8E]/10 group-hover:bg-[#7B2D8E]/20'
            }
          `}>
            {isPlaying ? (
              // Pause icon
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              // Play icon
              <svg className="w-4 h-4 text-[#7B2D8E]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </div>
        
        {/* Animated ring when playing */}
        {isPlaying && (
          <div className="absolute -inset-1 rounded-2xl border border-[#7B2D8E]/30 animate-pulse" />
        )}
      </div>
    </button>
  )
}
