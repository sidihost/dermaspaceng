"use client"

import { useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"

const SCROLL_STORAGE_KEY = "dermaspace-scroll-positions"
const SCROLL_DEBOUNCE_MS = 150

interface ScrollPositions {
  [path: string]: {
    x: number
    y: number
    timestamp: number
  }
}

// Max age for scroll positions (30 minutes)
const MAX_AGE_MS = 30 * 60 * 1000

export function ScrollPositionRestore() {
  const pathname = usePathname()
  const hasRestoredRef = useRef(false)
  const isRestoringRef = useRef(false)

  // Get stored scroll positions
  const getScrollPositions = useCallback((): ScrollPositions => {
    if (typeof window === "undefined") return {}
    try {
      const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY)
      if (!stored) return {}
      const positions: ScrollPositions = JSON.parse(stored)
      
      // Clean up old entries
      const now = Date.now()
      const cleaned: ScrollPositions = {}
      for (const [path, data] of Object.entries(positions)) {
        if (now - data.timestamp < MAX_AGE_MS) {
          cleaned[path] = data
        }
      }
      return cleaned
    } catch {
      return {}
    }
  }, [])

  // Save scroll position for current path
  const saveScrollPosition = useCallback(() => {
    if (isRestoringRef.current) return
    
    const positions = getScrollPositions()
    positions[pathname] = {
      x: window.scrollX,
      y: window.scrollY,
      timestamp: Date.now(),
    }
    
    try {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(positions))
    } catch {
      // Storage full or unavailable
    }
  }, [pathname, getScrollPositions])

  // Restore scroll position when page loads
  useEffect(() => {
    if (hasRestoredRef.current) return
    
    const positions = getScrollPositions()
    const savedPosition = positions[pathname]
    
    if (savedPosition && savedPosition.y > 0) {
      isRestoringRef.current = true
      
      // Wait for content to load before restoring
      const restoreScroll = () => {
        window.scrollTo({
          top: savedPosition.y,
          left: savedPosition.x,
          behavior: "instant",
        })
        
        // Double-check scroll position after a short delay (for lazy-loaded content)
        setTimeout(() => {
          if (window.scrollY < savedPosition.y - 100) {
            window.scrollTo({
              top: savedPosition.y,
              left: savedPosition.x,
              behavior: "instant",
            })
          }
          isRestoringRef.current = false
        }, 100)
      }
      
      // Try immediately and also after a delay for dynamic content
      requestAnimationFrame(() => {
        restoreScroll()
        hasRestoredRef.current = true
      })
    } else {
      hasRestoredRef.current = true
    }
  }, [pathname, getScrollPositions])

  // Reset restoration flag when pathname changes
  useEffect(() => {
    hasRestoredRef.current = false
  }, [pathname])

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(saveScrollPosition, SCROLL_DEBOUNCE_MS)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    
    // Save on page hide (user leaves or closes tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveScrollPosition()
      }
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange)
    
    // Save before unload
    const handleBeforeUnload = () => {
      saveScrollPosition()
    }
    
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [saveScrollPosition])

  return null
}
