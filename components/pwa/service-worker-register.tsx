'use client'

import { useEffect, useState } from 'react'
import { X, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import Image from 'next/image'

export function ServiceWorkerRegister() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check initial online status
    setIsOffline(!navigator.onLine)

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
          '[v0] Skipping stale-bundle recovery because the device is offline:',
          reason,
        )
        return
      }
      sessionStorage.setItem(RECOVERY_FLAG, '1')
      console.warn('[v0] Detected stale chunk reference, recovering:', reason)
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
        console.error('[v0] Cache wipe failed:', err)
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
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  // ---------------------------------------------------------------
  // Tell the SW to precache every page the user actually visits.
  //
  // The SW's navigation handler only sees full-page navigations
  // (`request.mode === 'navigate'`), but Next.js' client router
  // renders in-app link clicks via RSC payloads — meaning a user
  // who taps Home → Services → Booking only ever issued ONE real
  // navigation. The other URLs were never seen by the SW and so
  // never landed in PAGES_CACHE, which is why "pages I visited
  // don't work offline" was the reported symptom.
  //
  // On every pathname change we post `CACHE_NAVIGATION` to the
  // active SW with the current URL (path + search). The SW does a
  // background navigation-mode fetch and stores the HTML in
  // PAGES_CACHE under the same key its navigation handler would
  // use, so the existing offline-lookup path serves it
  // transparently next time the user reaches that URL offline.
  //
  // Skipped when:
  //   - SW isn't installed yet (no controller + no `ready`)
  //   - The user is currently offline (network fetch would fail)
  //   - The URL is an /api/* or /_next/* path (not a page)
  // ---------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (!navigator.onLine) return
    if (!pathname) return
    // Skip non-page routes — defence in depth; the SW also filters
    // these, but skipping the postMessage saves a roundtrip.
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) return

    const url = pathname + window.location.search

    // Defer to idle so we don't compete with the page's own
    // hydration / data fetches for bandwidth on slow connections.
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout?: number }) => number)
      | undefined
    const cic = (window as any).cancelIdleCallback as
      | ((id: number) => void)
      | undefined
    const schedule = ric ?? ((cb: () => void) => window.setTimeout(cb, 1500))
    const cancel = cic ?? ((id: number) => window.clearTimeout(id))

    const handle = schedule(() => {
      const send = () => {
        try {
          navigator.serviceWorker.controller?.postMessage({
            type: 'CACHE_NAVIGATION',
            url,
          })
        } catch {
          /* ignore — best-effort */
        }
      }
      // If the SW isn't controlling yet (first install on this
      // page), wait for `ready` and try once when it takes over.
      if (navigator.serviceWorker.controller) {
        send()
      } else {
        navigator.serviceWorker.ready.then(send).catch(() => {})
      }
    })

    return () => {
      try {
        cancel(handle as number)
      } catch {
        /* ignore */
      }
    }
  }, [pathname])

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
      {/* Offline Banner — was previously `fixed top-0`, which sat
          on the same row as the page's `sticky top-0` header and
          obscured the wordmark + greeting (the team flagged this
          in a screenshot). We now render it in normal document
          flow as the very first element in <body>, so it sits
          ABOVE the sticky header at scroll-top and scrolls away
          naturally as the user moves down the page (the same
          treatment Linear / Slack / GitHub use for "you're
          offline" strips). Reverting to a sticky layout would
          re-introduce the overlap because two `sticky top-0`
          siblings compete for the same pin point. Copy matches
          /offline + the SW shell so the three states read as
          one. */}
      {isOffline && (
        <div
          className="relative z-[100] bg-[#7B2D8E] text-white px-4 py-2 text-center text-[13px] font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300"
          role="status"
          aria-live="polite"
        >
          <WifiOff className="w-3.5 h-3.5" aria-hidden />
          <span>You&apos;re offline — some access might be limited.</span>
        </div>
      )}

      {/* Online Restored Banner — kept in-flow for the same
          reason; the previous `fixed top-0` would re-cover the
          header for the brief moment we flip it on. */}
      {!isOffline && (
        <div
          id="online-banner"
          className="hidden relative z-[100] bg-[#7B2D8E] text-white px-4 py-2 text-center text-sm font-medium"
        >
          <Wifi className="w-4 h-4 inline mr-2" />
          Back online!
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[360px] z-[90] animate-in slide-in-from-bottom duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
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
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg p-1.5">
                  <Image
                    src="/icons/icon-512x512.webp"
                    alt="Dermaspace"
                    width={44}
                    height={44}
                    className="object-contain"
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

      {/* Update Prompt */}
      {showUpdatePrompt && (
        <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[360px] z-[90] animate-in slide-in-from-bottom duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-6 h-6 text-[#7B2D8E]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">Update Available</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  A new version of Dermaspace is ready
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowUpdatePrompt(false)}
                className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-full transition-colors border border-gray-200"
              >
                Later
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2.5 text-sm bg-[#7B2D8E] text-white rounded-full hover:bg-[#6B2D7E] transition-colors font-medium"
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
