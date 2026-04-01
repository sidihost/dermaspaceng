'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Volume2, VolumeX, Music } from 'lucide-react'

// Royalty-free spa/relaxation music URLs
const MUSIC_URLS = [
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', // Relaxing piano
  'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3', // Spa ambient
]

export default function AmbientMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const pathname = usePathname()

  // Pages where music should play
  const musicPages = ['/', '/services', '/about', '/gallery', '/contact', '/booking', '/packages']
  const shouldPlayMusic = musicPages.some(page => pathname === page || pathname.startsWith(page + '/'))

  useEffect(() => {
    // Create audio element
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.loop = true
      audioRef.current.volume = 0.12
      audioRef.current.preload = 'auto'
      
      // Try first URL, fallback to second if fails
      audioRef.current.src = MUSIC_URLS[0]
      audioRef.current.onerror = () => {
        if (audioRef.current) {
          audioRef.current.src = MUSIC_URLS[1]
        }
      }
    }

    // Auto-play music when component mounts
    const tryAutoPlay = async () => {
      if (audioRef.current && shouldPlayMusic) {
        try {
          await audioRef.current.play()
          setIsPlaying(true)
        } catch {
          // Autoplay blocked by browser - that's ok, user can click to play
          setIsPlaying(false)
        }
      }
      // Show the button after attempting autoplay
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

  // Don't show button on pages where music shouldn't play
  if (!shouldPlayMusic || !isVisible) return null

  return (
    <button
      onClick={toggleMusic}
      className="fixed bottom-24 md:bottom-6 right-4 z-40 group"
      aria-label={isPlaying ? 'Pause music' : 'Play music'}
    >
      <div className="relative">
        {/* Outer glow ring when playing */}
        {isPlaying && (
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] opacity-30 blur-sm animate-pulse" />
        )}
        
        {/* Main button */}
        <div className={`
          relative w-12 h-12 rounded-full flex items-center justify-center
          shadow-lg border transition-all duration-300 overflow-hidden
          ${isPlaying 
            ? 'bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] border-[#9B4DB0]/50' 
            : 'bg-white border-gray-200 hover:border-[#7B2D8E]/30'
          }
          group-hover:scale-105 group-active:scale-95
        `}>
          {/* Animated sound waves when playing */}
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center gap-0.5">
              <span className="w-0.5 h-3 bg-white/30 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 h-4 bg-white/30 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 h-2 bg-white/30 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          
          {/* Icon */}
          <div className="relative z-10">
            {isPlaying ? (
              <Volume2 className="w-5 h-5 text-white" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400 group-hover:text-[#7B2D8E] transition-colors" />
            )}
          </div>
        </div>

        {/* Label tooltip */}
        <div className={`
          absolute right-full mr-2 top-1/2 -translate-y-1/2
          px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap
          opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
          ${isPlaying ? 'bg-[#7B2D8E] text-white' : 'bg-gray-900 text-white'}
        `}>
          {isPlaying ? 'Pause' : 'Play music'}
        </div>
      </div>
    </button>
  )
}
