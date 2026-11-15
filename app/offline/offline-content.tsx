'use client'

import { useEffect, useRef, useState } from 'react'
import { SystemStatusCard } from '@/components/shared/system-status-card'

export default function OfflineContent() {
  const [isOnline, setIsOnline] = useState(false)
  const [statusNote, setStatusNote] = useState<string>('Waiting for internet connection…')
  const wasOfflineRef = useRef(false)

  useEffect(() => {
    let reloadTimer: number | null = null

    const sync = (fromEvent: boolean) => {
      const online = typeof navigator !== 'undefined' && navigator.onLine
      setIsOnline(online)
      if (!online) {
        wasOfflineRef.current = true
        setStatusNote('Waiting for internet connection…')
        return
      }

      if (fromEvent && wasOfflineRef.current) {
        setStatusNote('Connection restored — reloading…')
        reloadTimer = window.setTimeout(() => {
          window.location.href = '/'
        }, 600)
      } else {
        setStatusNote('Connection ready — tap Try again.')
      }
    }

    sync(false)
    const onOnline = () => sync(true)
    const onOffline = () => sync(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      if (reloadTimer) window.clearTimeout(reloadTimer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const handleRetry = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      window.location.href = '/'
    } else {
      setStatusNote("Still offline — we'll reload automatically once you reconnect.")
    }
  }

  return (
    <main>
      <SystemStatusCard
        variant="offline"
        onRetry={handleRetry}
        statusNote={statusNote}
        connectionRestored={isOnline}
      />
    </main>
  )
}
