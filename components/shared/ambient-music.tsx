'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Volume2, VolumeX } from 'lucide-react'

const MUSIC_URLS = [
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
  'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3',
]

export default function AmbientMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  // `usePathname()` can return `null` in edge cases (pre-hydration,
  // app-shell transitions). Default to an empty string so the
  // downstream `.startsWith()` call never throws, which was crashing
  // the entire page on production.
  const pathname = usePathname() ?? ''

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
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-300
        ${isPlaying 
          ? 'bg-[#7B2D8E] border-[#7B2D8E] text-white' 
          : 'bg-white border-gray-200 text-gray-600 hover:border-[#7B2D8E] hover:text-[#7B2D8E]'
        }
      `}>
        {/* Equalizer bars */}
        <div className="flex items-end gap-[2px] h-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-[3px] rounded-full ${isPlaying ? 'bg-white' : 'bg-current'}`}
              style={{
                height: isPlaying ? undefined : '4px',
                animation: isPlaying ? `soundwave 0.5s ease-in-out infinite` : 'none',
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
        
        {/* Icon */}
        {isPlaying ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </div>
    </button>
  )
}
