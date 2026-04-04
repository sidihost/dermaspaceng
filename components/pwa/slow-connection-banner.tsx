'use client'

import { useEffect, useState, useRef } from 'react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { Wifi, X } from 'lucide-react'

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
    <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto sm:min-w-[320px] z-[80] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-white border border-amber-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
        <div className="w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0">
          <Wifi className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Slow Connection Detected</p>
          <p className="text-xs text-gray-500">Using lite mode for faster loading</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}
