'use client'

import { useState, useRef, useEffect } from 'react'
import { Volume2, VolumeX, Music } from 'lucide-react'

export default function AmbientMusic() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Relaxing spa music URL - royalty free ambient music
  const musicUrl = "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3"

  useEffect(() => {
    // Show tooltip after 3 seconds if user hasn't interacted
    const timer = setTimeout(() => {
      if (!hasInteracted) {
        setShowTooltip(true)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [hasInteracted])

  useEffect(() => {
    // Hide tooltip after 5 seconds
    if (showTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showTooltip])

  const togglePlay = () => {
    setHasInteracted(true)
    setShowTooltip(false)
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={musicUrl}
        loop
        preload="none"
      />
      
      {/* Floating Music Button */}
      <div className="fixed bottom-24 right-4 z-40 md:bottom-6">
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 animate-fade-in">
            <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
              Tap for relaxing spa music
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
        
        <button
          onClick={togglePlay}
          className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
            isPlaying 
              ? 'bg-[#7B2D8E] text-white' 
              : 'bg-white text-[#7B2D8E] border border-gray-200 hover:border-[#7B2D8E]/30'
          }`}
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
        >
          {/* Animated rings when playing */}
          {isPlaying && (
            <>
              <span className="absolute inset-0 rounded-full bg-[#7B2D8E]/30 animate-ping" />
              <span className="absolute inset-[-4px] rounded-full border-2 border-[#7B2D8E]/20 animate-pulse" />
            </>
          )}
          
          {isPlaying ? (
            <Volume2 className="w-5 h-5 relative z-10" />
          ) : (
            <div className="relative">
              <Music className="w-5 h-5" />
            </div>
          )}
        </button>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </>
  )
}
