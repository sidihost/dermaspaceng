'use client'

import { useEffect, useState } from 'react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { Zap, X } from 'lucide-react'

export function SlowConnectionBanner() {
  const { isSlowConnection, effectiveType, isOnline } = useNetworkStatus()
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [hasShownThisSession, setHasShownThisSession] = useState(false)

  useEffect(() => {
    // Only show banner once per session and if slow connection detected
    if (isSlowConnection && isOnline && !dismissed && !hasShownThisSession) {
      const timer = setTimeout(() => {
        setShowBanner(true)
        setHasShownThisSession(true)
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowBanner(false)
        }, 5000)
      }, 2000) // Wait 2 seconds before showing
      return () => clearTimeout(timer)
    }
    
    // Hide immediately when connection improves
    if (!isSlowConnection && showBanner) {
      setShowBanner(false)
    }
  }, [isSlowConnection, isOnline, dismissed, hasShownThisSession, showBanner])

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-4 md:w-72 z-[80] animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 rounded-xl p-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[#7B2D8E]/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-[#7B2D8E]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#7B2D8E]">Slow Connection Detected</p>
            <p className="text-[10px] text-[#7B2D8E]/70 mt-0.5">
              {effectiveType === '2g' || effectiveType === 'slow-2g' 
                ? 'Using lite mode for faster loading'
                : 'Some features may load slowly'}
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-[#7B2D8E]/20 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3 text-[#7B2D8E]/60" />
          </button>
        </div>
      </div>
    </div>
  )
}
