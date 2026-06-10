"use client"

// ---------------------------------------------------------------------------
// Root-layout error boundary.
//
// Next.js's per-route `app/error.tsx` cannot catch errors thrown inside the
// root `app/layout.tsx` itself or any client component imported into it
// (the `ServiceWorkerRegister`, the inline error reporter, the analytics
// pixels…). When those throw, the framework falls back to its default
// hard-coded white-screen message:
//
//   "Application error: a client-side exception has occurred while loading
//    www.dermaspaceng.com (see the browser console for more information)."
//
// That's the exact text Nigerian users reported seeing whenever they
// refreshed the site offline — the cached HTML loaded fine, but a JS chunk
// failed to fetch (no network), the `ChunkLoadError` bubbled all the way up
// past the root layout, and there was no global-error.tsx to catch it.
//
// This file replaces that fallback with a fully self-contained, dependency-
// free branded screen. It MUST render its own <html>/<body> per the Next.js
// contract — it sits OUTSIDE the root layout. We deliberately use inline
// styles instead of Tailwind classes so the page works even when Tailwind's
// stylesheet failed to load (which is part of why we're here in the first
// place). Same for fonts, icons, etc — every visual is plain HTML/SVG
// rendered from this single file.
//
// Behaviour:
//   • If the device is offline, show the offline shell (matches the SW's
//     OFFLINE_HTML inline page in tone — purple primary, "you're offline",
//     phone number, branch addresses).
//   • If the device is online, show the standard "Something went sideways"
//     branded crash screen with two CTAs.
//   • Both paths can call `reset()` to retry, or `location.reload()` to
//     hard-reload — whichever is more appropriate.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react"

const BRAND = "#7B2D8E"
const BRAND_DARK = "#5A1D6A"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const update = () =>
      setIsOffline(typeof navigator !== "undefined" && !navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  // Best-effort reporting so we still get telemetry on errors that
  // bypass the route-level boundary. Silently no-ops when offline
  // since sendBeacon will fail anyway.
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return
    try {
      const w = window as unknown as {
        __dermaspaceReportError?: (p: unknown) => void
      }
      const payload = {
        source: "global-error-boundary",
        message: error?.message || "global error",
        stack: error?.stack || "",
        digest: error?.digest || "",
      }
      if (typeof w.__dermaspaceReportError === "function") {
        w.__dermaspaceReportError(payload)
      }
    } catch {
      /* ignore */
    }
  }, [error])

  const tryAgain = () => {
    // If we've come back online by the time the user taps, let
    // Next.js retry the segment; otherwise hard-reload so the SW's
    // network-first navigation strategy gets re-triggered once
    // connectivity returns.
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        reset()
        return
      } catch {
        /* fall through */
      }
    }
    try {
      window.location.reload()
    } catch {
      /* ignore */
    }
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{isOffline ? "You're offline" : "Something went wrong"}</title>
        <meta name="theme-color" content={BRAND} />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#F7F5F9",
          color: "#0F172A",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            maxWidth: 480,
            margin: "0 auto",
            padding: "0 20px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ paddingTop: 64, textAlign: "center" }}>
            <div
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "rgba(123, 45, 142, 0.1)",
                color: BRAND,
                marginBottom: 24,
              }}
            >
              {isOffline ? <OfflineGlyph /> : <SpaceGlyph />}
            </div>

            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                margin: "0 0 8px 0",
                color: "#0F172A",
              }}
            >
              {isOffline ? "You\u2019re offline" : "Something went sideways"}
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: "#475569",
                margin: "0 0 24px 0",
              }}
            >
              {isOffline
                ? "We can\u2019t reach Dermaspace right now because your device has lost its internet connection. Check your Wi-Fi or mobile data and we\u2019ll be right back."
                : "We hit an unexpected hiccup loading the page. It\u2019s on us, not you. Give it another go \u2014 most issues clear up with a quick retry."}
            </p>

            {isOffline ? (
              <div
                style={{
                  background: "rgba(123, 45, 142, 0.05)",
                  border: "1px solid rgba(123, 45, 142, 0.1)",
                  borderRadius: 16,
                  padding: 16,
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    margin: "0 0 8px 0",
                    color: "#0F172A",
                  }}
                >
                  Need to reach us?
                </p>
                <a
                  href="tel:+2349061836625"
                  style={{
                    display: "block",
                    fontSize: 14,
                    color: BRAND,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  +234 906 183 6625
                </a>
                <p
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                    margin: "8px 0 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  Victoria Island: 237B Muri Okunola St
                  <br />
                  Ikoyi: 9 Agbeke Rotinwa Cl, Dolphin Estate
                </p>
              </div>
            ) : null}
          </div>

          <div
            style={{
              padding: "24px 0 calc(env(safe-area-inset-bottom) + 16px) 0",
            }}
          >
            <button
              type="button"
              onClick={tryAgain}
              style={{
                display: "block",
                width: "100%",
                height: 48,
                borderRadius: 16,
                background: BRAND,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                marginBottom: 8,
              }}
              onMouseDown={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  BRAND_DARK
              }}
              onMouseUp={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  BRAND
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: 48,
                borderRadius: 16,
                background: "#F1F5F9",
                color: "#1E293B",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Back to Home
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}

// Tiny inline SVG glyphs — no lucide dep so this still renders if every
// chunk failed to load.
function OfflineGlyph() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 8.82a15 15 0 0 1 20 0M5 12.86a10 10 0 0 1 14 0M8.5 16.43a5 5 0 0 1 7 0M2 2l20 20"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SpaceGlyph() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  )
}
