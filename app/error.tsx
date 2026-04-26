"use client"

// ---------------------------------------------------------------------------
// Branded route-segment error boundary.
//
// Replaces Next.js's default "Application error: a client-side exception
// has occurred" white screen for any uncaught error inside the (root) layout
// tree. Lives at `/app/error.tsx` so it auto-wraps every route below the
// root segment but is in turn wrapped by `app/global-error.tsx` (which
// catches errors in the root layout itself).
//
// Keeps the user inside the brand: same purple primary, friendly copy, two
// clear actions (try again / back to home), and a dev-only error detail
// hidden behind a `<details>` so support can ask "tap the chevron and read
// me what it says" without leaking stack traces to every visitor.
//
// IMPORTANT — offline-aware fallback
// ----------------------------------
// When the device is fully offline, the most common cause of an "error"
// reaching this boundary is a fetch / chunk request failing. Showing the
// generic "Something went sideways" copy in that case is misleading — the
// user just lost their internet. So we detect `navigator.onLine === false`
// and render the full branded offline shell instead, matching what the
// service worker serves for cold navigations.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react"
import Link from "next/link"
import { ButterflyLogo } from "@/components/shared/butterfly-logo"
import { RefreshCw, Home, WifiOff, Phone } from "lucide-react"

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Track the device's connectivity so we can swap the entire fallback to
  // the branded offline shell when the user is genuinely offline. We start
  // optimistic (online) for the very first render so SSR/hydration agree,
  // then read the real `navigator.onLine` value in an effect.
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const update = () => setIsOffline(typeof navigator !== "undefined" && !navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  // One-shot silent auto-recovery. Most "Application error" white
  // screens users hit on browser-back are transient — a stale React
  // closure from a torn-down route, a chunk that briefly 404'd during
  // a deploy, an effect that ran before its provider mounted. We
  // call `reset()` once, immediately, on mount; if the rerender
  // succeeds (which it almost always does) the user never sees this
  // screen at all. A 5s sessionStorage cooldown prevents a
  // deterministically-broken page from pinging reset() in a loop.
  useEffect(() => {
    const COOLDOWN_KEY = "derma-error-auto-retry-ts"
    let shouldRetry = true
    try {
      const last = Number(sessionStorage.getItem(COOLDOWN_KEY) || "0")
      if (Date.now() - last < 5_000) shouldRetry = false
      else sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()))
    } catch {
      /* sessionStorage disabled — still try once */
    }
    if (!shouldRetry) return
    // requestAnimationFrame so React fully commits this fallback
    // first; calling reset() during the render pass would re-throw.
    const raf = requestAnimationFrame(() => {
      try { reset() } catch { /* ignore */ }
    })
    return () => cancelAnimationFrame(raf)
  }, [reset])

  useEffect(() => {
    // Surface the error in the server logs so we can see it in our log
    // pipeline. The `[v0]` tag matches the rest of the codebase's
    // debug-log convention.
    console.error("[v0] Route error boundary caught:", error)
    // Forward to /api/client-errors so the failure shows up in Vercel
    // deployment logs (filter: "[CLIENT-ERROR]"). Reuses the transport
    // installed by the inline reporter in `app/layout.tsx`'s <head>.
    try {
      const w = window as unknown as { __dermaspaceReportError?: (p: unknown) => void }
      const payload = {
        source: "react-error-boundary",
        message: error?.message || "route error",
        stack: error?.stack || "",
        digest: error?.digest || "",
      }
      if (typeof w.__dermaspaceReportError === "function") {
        w.__dermaspaceReportError(payload)
      } else {
        const body = JSON.stringify({ ...payload, url: location.href })
        const blob = new Blob([body], { type: "application/json" })
        if (!navigator.sendBeacon || !navigator.sendBeacon("/api/client-errors", blob)) {
          fetch("/api/client-errors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {})
        }
      }
    } catch {
      /* never let the reporter crash the error screen itself */
    }
  }, [error])

  // -----------------------------------------------------------------------
  // Offline branch — when the device has no connection, the user almost
  // certainly hit this boundary because a fetch / chunk request failed,
  // not because of a real bug in our code. Show the same friendly offline
  // shell the service worker serves for cold navigations rather than the
  // generic "Something went sideways" copy.
  // -----------------------------------------------------------------------
  if (isOffline) {
    return (
      <main className="fixed inset-0 flex flex-col bg-white text-gray-900">
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-md mx-auto px-5 pt-16 pb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] mb-6">
              <WifiOff className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-balance">
              You&apos;re offline
            </h1>
            <p className="text-sm text-gray-600 mb-6 text-pretty leading-relaxed">
              We can&apos;t reach Dermaspace right now because your device has
              lost its internet connection. Check your Wi-Fi or mobile data
              and we&apos;ll be right back.
            </p>

            <div className="bg-[#7B2D8E]/5 border border-[#7B2D8E]/10 rounded-2xl px-4 py-4 text-left">
              <p className="text-xs font-semibold text-gray-900 mb-2">
                Need to reach us?
              </p>
              <a
                href="tel:+2349017972919"
                className="flex items-center gap-2 text-sm text-[#7B2D8E] font-medium"
              >
                <Phone className="w-4 h-4" />
                +234 901 797 2919
              </a>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Victoria Island: 237B Muri Okunola St
                <br />
                Ikoyi: 44A Awolowo Road
              </p>
            </div>
          </div>
        </div>

        <div
          className="flex-shrink-0 bg-white border-t border-gray-100 px-4 pt-3 space-y-2"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
          }}
        >
          <button
            onClick={() => {
              // If we've come back online by the time the user taps, let
              // Next.js retry the segment; otherwise a hard reload is the
              // most reliable way to re-trigger the SW's network-first
              // navigation strategy once connectivity returns.
              if (typeof navigator !== "undefined" && navigator.onLine) {
                reset()
              } else {
                window.location.reload()
              }
            }}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-[#7B2D8E] text-white text-sm font-semibold active:bg-[#5A1D6A] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-gray-100 text-gray-800 text-sm font-semibold active:bg-gray-200 transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="fixed inset-0 flex flex-col bg-[#F7F5F9] text-gray-900">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-md mx-auto px-5 pt-16 pb-8 text-center">
          {/* Wordmark — keeps the brand visible while everything else is
              broken. Pure SVG so it never depends on a network request. */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] mb-6">
            <ButterflyLogo className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-balance">
            Something went sideways
          </h1>
          <p className="text-sm text-gray-600 mb-6 text-pretty leading-relaxed">
            We hit an unexpected hiccup loading this page. It&apos;s on us, not
            you. Give it another go — most issues clear up with a quick retry.
          </p>

          {/* Hidden error detail — collapsed by default. Helps support
              triage without scaring the user. The digest is what Next.js
              ships to its server logs, so quoting it lets us correlate. */}
          {(error?.message || error?.digest) && (
            <details className="mb-6 text-left bg-white rounded-2xl border border-gray-100 px-4 py-3">
              <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none">
                Technical details
              </summary>
              <div className="mt-2 space-y-1 text-[11px] text-gray-500 font-mono break-words">
                {error?.message && <p>{error.message}</p>}
                {error?.digest && (
                  <p className="text-gray-400">Ref: {error.digest}</p>
                )}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Sticky CTA bar — same shape as the rest of the app so the error
          screen still feels like part of the product. Two actions: try
          again (calls Next's `reset()` to re-render the segment) and go
          home (a hard nav so even a broken router state recovers). */}
      <div
        className="flex-shrink-0 bg-white border-t border-gray-100 px-4 pt-3 space-y-2"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-[#7B2D8E] text-white text-sm font-semibold active:bg-[#5A1D6A] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-gray-100 text-gray-800 text-sm font-semibold active:bg-gray-200 transition-colors"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </main>
  )
}
