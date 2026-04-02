'use client'

import { useState, useEffect, useCallback } from 'react'

interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  connectionType: string | null
  effectiveType: string | null
  downlink: number | null
  rtt: number | null
  saveData: boolean
}

interface NetworkInformation extends EventTarget {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
  downlink: number
  rtt: number
  saveData: boolean
  type: string
  addEventListener(type: 'change', listener: () => void): void
  removeEventListener(type: 'change', listener: () => void): void
}

declare global {
  interface Navigator {
    connection?: NetworkInformation
    mozConnection?: NetworkInformation
    webkitConnection?: NetworkInformation
  }
}

export function useNetworkStatus(): NetworkStatus {
  const getConnection = (): NetworkInformation | null => {
    if (typeof navigator === 'undefined') return null
    try {
      return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null
    } catch {
      // Some browsers may throw when accessing these properties
      return null
    }
  }

  const getNetworkStatus = useCallback((): NetworkStatus => {
    const connection = getConnection()
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    if (!connection) {
      return {
        isOnline,
        isSlowConnection: false,
        connectionType: null,
        effectiveType: null,
        downlink: null,
        rtt: null,
        saveData: false,
      }
    }

    // Safely access properties with fallbacks
    const effectiveType = connection.effectiveType || null
    const rtt = typeof connection.rtt === 'number' ? connection.rtt : null
    const downlink = typeof connection.downlink === 'number' ? connection.downlink : null
    
    // Only flag as slow if we have reliable data
    const isSlowConnection = 
      effectiveType === 'slow-2g' || 
      effectiveType === '2g' ||
      (rtt !== null && rtt > 500) ||
      (downlink !== null && downlink < 0.5)

    return {
      isOnline,
      isSlowConnection,
      connectionType: connection.type || null,
      effectiveType,
      downlink,
      rtt,
      saveData: connection.saveData || false,
    }
  }, [])

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => getNetworkStatus())

  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(getNetworkStatus())
    }

    // Listen for online/offline changes
    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    // Listen for connection changes
    const connection = getConnection()
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus)
      }
    }
  }, [getNetworkStatus])

  return networkStatus
}

// Hook for adaptive loading based on network conditions
export function useAdaptiveLoading() {
  const { isSlowConnection, saveData, effectiveType } = useNetworkStatus()

  return {
    // Should we load high-res images?
    loadHighResImages: !isSlowConnection && !saveData,
    // Should we autoplay videos?
    autoplayVideos: !isSlowConnection && !saveData && effectiveType === '4g',
    // Should we prefetch content?
    shouldPrefetch: !isSlowConnection && !saveData,
    // Image quality to use (low, medium, high)
    imageQuality: isSlowConnection || saveData ? 'low' : effectiveType === '4g' ? 'high' : 'medium',
    // Should we load animations?
    loadAnimations: !isSlowConnection && !saveData,
  }
}
