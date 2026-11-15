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
import { SystemStatusCard } from "@/components/shared/system-status-card"
import { resolveRetryAction } from "@/lib/system-status"

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
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const [connectionRestored, setConnectionRestored] = useState(false)

  useEffect(() => {
    const update = () => {
      const offline = typeof navigator !== "undefined" && !navigator.onLine
      setIsOffline(offline)
      if (!offline) {
        setConnectionRestored(true)
        setStatusNote(null)
      } else {
        setConnectionRestored(false)
        setStatusNote("Waiting for internet connection…")
      }
    }
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  // One-shot silent auto-recovery.
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
    const raf = requestAnimationFrame(() => {
      try {
        reset()
      } catch {
        /* ignore */
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [reset])

  useEffect(() => {
    console.error("Route error boundary caught:", error)
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

  const handleRetry = () => {
    const online = typeof navigator === "undefined" || navigator.onLine
    if (isOffline && !online) {
      setStatusNote("Still offline — we'll retry as soon as you reconnect.")
      return
    }
    const action = resolveRetryAction(online, true)
    if (action === "reset") {
      try {
        reset()
        return
      } catch {
        /* fall through to reload */
      }
    }
    window.location.reload()
  }

  return (
    <main className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-[#FAF6FB]">
      <SystemStatusCard
        variant={isOffline ? "offline" : "error"}
        onRetry={handleRetry}
        statusNote={isOffline ? statusNote : null}
        connectionRestored={connectionRestored}
        errorMessage={!isOffline ? error?.message : null}
        errorDigest={!isOffline ? error?.digest : null}
      />
    </main>
  )
}
