'use client'

// Slow connection notification banner component
import { useEffect, useState, useRef } from 'react'
import { useNetworkStatus } from '@/hooks/use-network-status'

export function SlowConnectionBanner() {
  const { isSlowConnection, isOnline } = useNetworkStatus()
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const hasShownRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (isSlowConnection && isOnline && !dismissed && !hasShownRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      
      timerRef.current = setTimeout(() => {
        setShowBanner(true)
        hasShownRef.current = true
        
        hideTimerRef.current = setTimeout(() => {
          setShowBanner(false)
        }, 5000)
      }, 3000)
    }
    
    if (!isSlowConnection && showBanner) {
      setShowBanner(false)
    }
  }, [isSlowConnection, isOnline, dismissed, showBanner])

  if (!showBanner) return null

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[80] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-white border border-amber-200 rounded-lg px-3 py-2.5 shadow-lg flex items-center gap-2.5">
        <div className="w-6 h-6 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <p className="text-sm text-gray-700">Slow connection - using lite mode</p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
