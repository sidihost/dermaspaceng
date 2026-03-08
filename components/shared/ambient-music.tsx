'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

// Royalty-free spa/relaxation music URLs
const MUSIC_URLS = [
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', // Relaxing piano
  'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3', // Spa ambient
]

export default function AmbientMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
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

    if (shouldPlayMusic && !isPlaying) {
      // Don't auto-start - wait for interaction
    } else if (!shouldPlayMusic && isPlaying) {
      audio.pause()
      setIsPlaying(false)
    }
  }, [shouldPlayMusic, isPlaying])

  // Start playing on first user interaction
  useEffect(() => {
    const startMusic = async () => {
      if (audioRef.current && shouldPlayMusic && !isPlaying) {
        try {
          await audioRef.current.play()
          setIsPlaying(true)
        } catch {
          // Autoplay blocked, will retry on next interaction
        }
      }
    }

    const handleInteraction = () => {
      startMusic()
    }

    // Listen for user interactions
    document.addEventListener('click', handleInteraction, { once: true })
    document.addEventListener('touchstart', handleInteraction, { once: true })
    document.addEventListener('scroll', handleInteraction, { once: true })

    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
      document.removeEventListener('scroll', handleInteraction)
    }
  }, [shouldPlayMusic, isPlaying])

  return null
}
