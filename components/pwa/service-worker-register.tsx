'use client'

import { useEffect, useState } from 'react'
import { X, Download, RefreshCw, Wifi, WifiOff } from 'lucide-react'

export function ServiceWorkerRegister() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check initial online status
    setIsOffline(!navigator.onLine)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope)

          // Check for updates periodically
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000) // Check every hour

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setShowUpdatePrompt(true)
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('SW registration failed:', error)
        })

      // Handle controller change (after update)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Show install prompt after a delay if user hasn't installed
      const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen')
      if (!hasSeenPrompt) {
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, 30000) // Show after 30 seconds
      }
    }

    // Handle online/offline status
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log('Install prompt outcome:', outcome)
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
      localStorage.setItem('pwa-install-prompt-seen', 'true')
    }
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-prompt-seen', 'true')
  }

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    }
    setShowUpdatePrompt(false)
  }

  return (
    <>
      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-[#7B2D8E] text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <WifiOff className="w-4 h-4" />
          <span>You&apos;re offline. Some features may be limited.</span>
        </div>
      )}

      {/* Online Restored Banner */}
      {!isOffline && (
        <div id="online-banner" className="hidden fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white px-4 py-2 text-center text-sm font-medium">
          <Wifi className="w-4 h-4 inline mr-2" />
          Back online!
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[90] animate-in slide-in-from-bottom duration-300">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
            <button
              onClick={dismissInstallPrompt}
              className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6 text-[#7B2D8E]" />
              </div>
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-gray-900 text-sm">Install Dermaspace</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add to home screen for quick access & offline booking
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={dismissInstallPrompt}
                className="flex-1 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 px-4 py-2 text-sm bg-[#7B2D8E] text-white rounded-lg hover:bg-[#6B2D7E] transition-colors font-medium"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Prompt */}
      {showUpdatePrompt && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[90] animate-in slide-in-from-bottom duration-300">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">Update Available</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  A new version is ready. Refresh to update.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowUpdatePrompt(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Later
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Update Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
