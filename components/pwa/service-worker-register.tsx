'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Image from 'next/image'
import { isServiceWorkerAllowedOrigin } from '@/lib/push-origin'
import { ACTIVE_SW_CACHE_NAME, getStaleCacheNames } from '@/lib/sw-cache-helpers'

export function ServiceWorkerRegister() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {

    // -----------------------------------------------------------------
    // Stale-bundle self-heal.
    //
    // Production users were getting "Application error: a client-side
    // exception has occurred" white-screens whenever a previously
    // installed service worker served stale cached HTML/JS that
    // referenced chunks deleted (or renamed) by a newer Vercel deploy.
    // The current sw.js won't poison anyone fresh, but anyone already
    // stuck needs an automatic escape hatch.
    //
    // We recover from two failure modes:
    //
    //   1. Chunk-load failures — React tries to fetch a chunk that no
    //      longer exists and the browser fires a `window.error` with a
    //      message like "Loading chunk N failed" / "ChunkLoadError" /
    //      "Failed to fetch dynamically imported module".
    //
    //   2. Temporal-dead-zone (TDZ) errors — a cached chunk references
    //      a binding (e.g. `aH`) from another chunk that was rebuilt
    //      with different minified names, surfacing as
    //      "Cannot access 'X' before initialization". Same root cause
    //      (cross-build chunk mismatch), same fix.
    //
    // On match: unregister every service worker we've installed, wipe
    // every cache we own, then reload — which gives the user a clean
    // fresh shell on the next navigation. Guarded by a sessionStorage
    // flag so we never loop on a genuine source-level bug.
    // -----------------------------------------------------------------
    const RECOVERY_FLAG = 'dermaspace-sw-recovered'
    const looksLikeChunkError = (msg: string | undefined | null) => {
      if (!msg) return false
      return (
        msg.includes('ChunkLoadError') ||
        msg.includes('Loading chunk') ||
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('module factory is not available') ||
        msg.includes('deleted in an HMR update') ||
        // TDZ across mismatched chunks, e.g.
        // "Cannot access 'aH' before initialization"
        (msg.includes('Cannot access') && msg.includes('before initialization'))
      )
    }
    const recoverFromBrokenCache = async (reason: string) => {
      if (sessionStorage.getItem(RECOVERY_FLAG)) return
      // CRITICAL: never run the cache-wipe recovery while the user is
      // offline. Chunks legitimately fail to load offline (the device
      // simply can't reach the CDN), and the symptoms look identical
      // to a stale-bundle problem. If we wiped caches and reloaded
      // here, the user would lose every offline asset we precached
      // and the reload itself would fall through to the browser's
      // native "no internet" page — which is exactly the breakage
      // Nigerian users on patchy data connections were reporting.
      // When connectivity returns, the next chunk-error event will
      // re-trigger this handler and recovery can proceed normally.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.warn(
          'Skipping stale-bundle recovery because the device is offline:',
          reason,
        )
        return
      }
      sessionStorage.setItem(RECOVERY_FLAG, '1')
      console.warn('Detected stale chunk reference, recovering:', reason)
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations()
          await Promise.all(regs.map((r) => r.unregister()))
        }
        if ('caches' in window) {
          const names = await caches.keys()
          await Promise.all(names.map((n) => caches.delete(n)))
        }
      } catch (err) {
        console.error('Cache wipe failed:', err)
      }
      window.location.reload()
    }
    const onError = (e: ErrorEvent) => {
      if (looksLikeChunkError(e.message) || looksLikeChunkError(e.error?.message)) {
        recoverFromBrokenCache(e.message || 'window.error')
      }
    }
    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      const msg =
        (typeof e.reason === 'string' ? e.reason : e.reason?.message) || ''
      if (looksLikeChunkError(msg)) {
        recoverFromBrokenCache(msg)
      }
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    // Immediately purge any legacy/bloated Cache Storage buckets (e.g. old
    // multi-megabyte image or page caches padded by Chromium's opaque quota)
    // and unused legacy `dermaspace-offline` IndexedDB database so returning
    // mobile devices drop from 40+ MB stored data to < 1 MB right away.
    const cleanupLegacyStorage = async () => {
      try {
        if ('caches' in window) {
          const names = await caches.keys()
          const stale = getStaleCacheNames(names, ACTIVE_SW_CACHE_NAME)
          if (stale.length > 0) {
            await Promise.all(stale.map((n) => caches.delete(n).catch(() => false)))
          }
        }
      } catch {
        /* ignore */
      }
      try {
        if (typeof indexedDB !== 'undefined' && typeof indexedDB.deleteDatabase === 'function') {
          indexedDB.deleteDatabase('dermaspace-offline')
        }
      } catch {
        /* ignore */
      }
    }
    void cleanupLegacyStorage()

    // Register lean service worker on canonical, localhost, and hosted app origins
    // (never on *.vercel.app or other ephemeral preview deployments).
    const canRegisterSw = isServiceWorkerAllowedOrigin(window.location.origin, {
      configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      allowLocalhost: true,
    })

    let updateInterval: number | null = null
    let onControllerChange: (() => void) | null = null
    let onSwMessage: ((event: MessageEvent) => void) | null = null

    if ('serviceWorker' in navigator && canRegisterSw) {
      const hadController = Boolean(navigator.serviceWorker.controller)
      let swReloading = false
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          // Proactively check for SW updates so returning users with the old
          // bloated SW upgrade to `dermaspace-lean-v1` immediately.
          registration.update().catch(() => {})

          // Check for updates periodically.
          updateInterval = window.setInterval(() => {
            registration.update().catch(() => {})
          }, 60 * 60 * 1000)
        })
        .catch(() => {
          // Silently skip when /sw.js is not deployed in the current environment.
        })

      // Handle controller change only when replacing an existing controller so
      // first-time SW activation (skipWaiting + clients.claim) never interrupts
      // initial image and avatar loading with an unexpected reload.
      onControllerChange = () => {
        if (!hadController || swReloading) return
        swReloading = true
        window.location.reload()
      }
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

      onSwMessage = (event: MessageEvent) => {
        if (event.data?.type === 'ds.pushReceived') {
          window.dispatchEvent(new CustomEvent('notifications:refresh'))
          window.dispatchEvent(new CustomEvent('live-chat:waiting-changed'))
        }
      }
      navigator.serviceWorker.addEventListener('message', onSwMessage)
    } else if ('serviceWorker' in navigator && !canRegisterSw) {
      console.log('[SW] Cleaning up SW and push subscriptions on preview domain')
      navigator.serviceWorker
        .getRegistrations?.()
        .then(async (regs) => {
          for (const reg of regs) {
            const sub = await reg.pushManager?.getSubscription().catch(() => null)
            if (sub) {
              await sub.unsubscribe().catch(() => {})
            }
            await reg.unregister().catch(() => {})
          }
          if ('caches' in window) {
            const names = await caches.keys().catch(() => [] as string[])
            await Promise.all(names.map((n) => caches.delete(n).catch(() => {})))
          }
        })
        .catch(() => {})
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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      if (updateInterval !== null) window.clearInterval(updateInterval)
      if ('serviceWorker' in navigator) {
        if (onControllerChange) {
          navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
        }
        if (onSwMessage) {
          navigator.serviceWorker.removeEventListener('message', onSwMessage)
        }
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
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

  if (!showInstallPrompt) return null

  return (
    <>
      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[360px] z-[90] animate-in slide-in-from-bottom duration-300">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Header — flat brand purple, no gradient */}
            <div className="bg-[#7B2D8E] px-5 py-4 relative">
              <button
                onClick={dismissInstallPrompt}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-white/30 p-1 overflow-hidden">
                  <Image
                    src="/icons/icon-192x192.png"
                    alt="Dermaspace"
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Dermaspace</h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    Spa & Wellness
                  </p>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Install our app for quick booking, exclusive offers, and offline access to your appointments.
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={dismissInstallPrompt}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-full transition-colors border border-gray-200"
                >
                  Maybe later
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 px-4 py-2.5 text-sm bg-[#7B2D8E] text-white rounded-full hover:bg-[#6B2D7E] transition-colors font-medium"
                >
                  Install App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
