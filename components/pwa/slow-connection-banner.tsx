'use client'

import { useEffect, useState, useRef } from 'react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { Zap, X } from 'lucide-react'

export function SlowConnectionBanner() {
  const { isSlowConnection, effectiveType, isOnline } = useNetworkStatus()
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const hasShownRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Cleanup function
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    // Only show banner once per session and if slow connection detected
    if (isSlowConnection && isOnline && !dismissed && !hasShownRef.current) {
      // Clear any existing timers
      if (timerRef.current) clearTimeout(timerRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      
      timerRef.current = setTimeout(() => {
        setShowBanner(true)
        hasShownRef.current = true
        
        // Auto-hide after 5 seconds
        hideTimerRef.current = setTimeout(() => {
          setShowBanner(false)
        }, 5000)
      }, 3000) // Wait 3 seconds before showing (increased from 2)
    }
    
    // Hide immediately when connection improves
    if (!isSlowConnection && showBanner) {
      setShowBanner(false)
    }
  }, [isSlowConnection, isOnline, dismissed, showBanner])

  if (!showBanner) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-white border border-gray-200 rounded-full px-4 py-2 shadow-lg flex items-center gap-3">
        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <p className="text-xs text-gray-600">
          Slow connection - using lite mode
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  )
}
