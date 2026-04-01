'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Volume2, VolumeX } from 'lucide-react'

// Royalty-free spa/relaxation music URLs
const MUSIC_URLS = [
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', // Relaxing piano
  'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3', // Spa ambient
]

export default function AmbientMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
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
    
    setHasInteracted(true)
    
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
  if (!shouldPlayMusic) return null

  return (
    <button
      onClick={toggleMusic}
      className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center shadow-lg hover:bg-[#5A1D6A] transition-colors"
      aria-label={isPlaying ? 'Mute music' : 'Play music'}
    >
      {isPlaying ? (
        <Volume2 className="w-4 h-4" />
      ) : (
        <VolumeX className="w-4 h-4" />
      )}
    </button>
  )
}
