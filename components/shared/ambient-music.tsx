'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function AmbientMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const pathname = usePathname()

  // Pages where music should play
  const musicPages = ['/', '/services', '/about', '/gallery', '/contact', '/booking']
  const shouldPlayMusic = musicPages.some(page => pathname === page || pathname.startsWith(page + '/'))

  useEffect(() => {
    // Create audio element only once
    if (!audioRef.current) {
      audioRef.current = new Audio('/spa-music.mp3')
      audioRef.current.loop = true
      audioRef.current.volume = 0.15
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (shouldPlayMusic && hasUserInteracted) {
      audio.play().catch(() => {
        // Autoplay was prevented, will try again on next interaction
      })
    } else {
      audio.pause()
    }
  }, [shouldPlayMusic, hasUserInteracted])

  // Listen for any user interaction to enable audio
  useEffect(() => {
    const enableAudio = () => {
      if (!hasUserInteracted) {
        setHasUserInteracted(true)
        // Try to play immediately after first interaction
        if (audioRef.current && shouldPlayMusic) {
          audioRef.current.play().catch(() => {})
        }
      }
    }

    // Listen to various interaction events
    const events = ['click', 'touchstart', 'keydown', 'scroll']
    events.forEach(event => {
      document.addEventListener(event, enableAudio, { once: true, passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, enableAudio)
      })
    }
  }, [hasUserInteracted, shouldPlayMusic])

  // No visible UI - music plays silently in background
  return null
}
