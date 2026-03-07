'use client'

import { useState, useRef, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

export default function AmbientMusic() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Very calm relaxing spa/meditation music - royalty free
  const musicUrl = "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3"

  // Start playing on first user interaction anywhere on page
  useEffect(() => {
    const startMusic = () => {
      if (hasInteracted) return
      
      const audio = audioRef.current
      if (audio) {
        audio.volume = 0.15 // Very low volume for calm ambient feel
        audio.play().then(() => {
          setIsPlaying(true)
          setHasInteracted(true)
        }).catch(() => {
          // Still blocked, will try again
        })
      }
    }

    // Listen for any user interaction
    document.addEventListener('click', startMusic)
    document.addEventListener('touchstart', startMusic)
    document.addEventListener('scroll', startMusic)
    document.addEventListener('keydown', startMusic)

    return () => {
      document.removeEventListener('click', startMusic)
      document.removeEventListener('touchstart', startMusic)
      document.removeEventListener('scroll', startMusic)
      document.removeEventListener('keydown', startMusic)
    }
  }, [hasInteracted])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.volume = 0.15
      audio.play().then(() => {
        setIsPlaying(true)
        setHasInteracted(true)
      }).catch(() => {})
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
          className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
            isPlaying 
              ? 'bg-[#7B2D8E] text-white' 
              : 'bg-white text-gray-500 border border-gray-200'
          }`}
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
        >
          {/* Animated rings when playing */}
          {isPlaying && (
            <>
              <span className="absolute inset-0 rounded-full bg-[#7B2D8E]/20 animate-ping" style={{ animationDuration: '2s' }} />
              <span className="absolute inset-[-2px] rounded-full border border-[#7B2D8E]/30 animate-pulse" />
            </>
          )}
          
          {isPlaying ? (
            <Volume2 className="w-4 h-4 relative z-10" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>
        
        {/* Hint text for users */}
        {!hasInteracted && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap animate-pulse">
            Tap to play music
          </div>
        )}
      </div>
    </>
  )
}
