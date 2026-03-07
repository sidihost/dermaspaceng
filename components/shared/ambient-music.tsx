'use client'

import { useState, useRef, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

export default function AmbientMusic() {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Calm relaxing spa music - royalty free
  const musicUrl = "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3"

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Set volume to low for ambient feel
    audio.volume = 0.3

    const handleCanPlay = () => {
      setIsLoaded(true)
      // Attempt autoplay
      audio.play().catch(() => {
        // Autoplay blocked by browser, wait for user interaction
        setIsPlaying(false)
      })
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [])

  // Handle user interaction to enable autoplay
  useEffect(() => {
    const enableAudio = () => {
      const audio = audioRef.current
      if (audio && !isPlaying && isLoaded) {
        audio.play().catch(() => {})
      }
      document.removeEventListener('click', enableAudio)
      document.removeEventListener('touchstart', enableAudio)
    }

    document.addEventListener('click', enableAudio)
    document.addEventListener('touchstart', enableAudio)

    return () => {
      document.removeEventListener('click', enableAudio)
      document.removeEventListener('touchstart', enableAudio)
    }
  }, [isPlaying, isLoaded])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={musicUrl}
        loop
        preload="auto"
      />
      
      {/* Floating Music Button */}
      <div className="fixed bottom-24 right-4 z-40 md:bottom-6">
        <button
          onClick={togglePlay}
          className={`group relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
            isPlaying 
              ? 'bg-[#7B2D8E] text-white' 
              : 'bg-white text-gray-400 border border-gray-200'
          }`}
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
        >
          {/* Animated rings when playing */}
          {isPlaying && (
            <>
              <span className="absolute inset-0 rounded-full bg-[#7B2D8E]/20 animate-ping" style={{ animationDuration: '2s' }} />
              <span className="absolute inset-[-3px] rounded-full border border-[#7B2D8E]/30 animate-pulse" />
            </>
          )}
          
          {isPlaying ? (
            <Volume2 className="w-4 h-4 relative z-10" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>
      </div>
    </>
  )
}
