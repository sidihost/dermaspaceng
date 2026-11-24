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
        <title>
          {isOffline
            ? "You're offline · Dermaspace"
            : "Something went wrong · Dermaspace"}
        </title>
        <meta name="theme-color" content={BRAND} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *,*::before,*::after{box-sizing:border-box}
              html,body{margin:0;padding:0;background:#FAF6FB;color:#1A0D1F;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
              .ds-wrap{min-height:100svh;display:flex;align-items:center;justify-content:center;padding:32px 16px}
              .ds-card{width:100%;max-width:540px;background:#fff;border:1px solid #E5E0EA;border-radius:16px;overflow:hidden}
              .ds-strip{height:2px;background:${BRAND}}
              .ds-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-bottom:1px solid #F1ECF5}
              .ds-brand{display:inline-flex;align-items:center;gap:10px;min-width:0}
              .ds-brand-mark{width:32px;height:32px;border-radius:8px;background:rgba(123,45,142,.1);color:${BRAND};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
              .ds-brand-name{font-family:Georgia,"Times New Roman",serif;font-size:16px;font-weight:600;color:#1A0D1F;letter-spacing:-.01em}
              .ds-tag{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:#4B5563;white-space:nowrap}
              .ds-dot{width:6px;height:6px;border-radius:999px;background:${BRAND};display:inline-block}
              .ds-dot-muted{background:#9CA3AF}
              .ds-main{padding:32px 24px 28px}
              .ds-icon{width:48px;height:48px;border-radius:16px;background:#FAF6FB;border:1px solid #E5E0EA;color:${BRAND};display:flex;align-items:center;justify-content:center}
              .ds-h1{margin:20px 0 0;font-family:Georgia,"Times New Roman",serif;font-size:26px;line-height:1.2;font-weight:600;color:#1A0D1F;letter-spacing:-.01em}
              .ds-p{margin:10px 0 0;max-width:440px;font-size:14px;line-height:1.65;color:#4B5563}
              .ds-actions{margin-top:24px;display:flex;flex-direction:column;gap:10px}
              .ds-btn{appearance:none;width:100%;height:44px;border-radius:999px;font:inherit;font-size:14px;font-weight:600;padding:0 24px;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;cursor:pointer;transition:background-color .15s ease,border-color .15s ease,color .15s ease}
              .ds-btn-primary{background:${BRAND};color:#fff;border:1px solid ${BRAND}}
              .ds-btn-primary:hover{opacity:.92}
              .ds-btn-secondary{background:#fff;color:#1A0D1F;border:1px solid #E5E0EA}
              .ds-btn-secondary:hover{border-color:rgba(123,45,142,.4);color:${BRAND}}
              .ds-foot{padding:24px;border-top:1px solid #F1ECF5}
              .ds-foot-title{margin:0;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#6B7280}
              .ds-branches{margin-top:16px;display:grid;grid-template-columns:1fr;gap:18px;text-align:left}
              .ds-branch-name{margin:0;font-size:14px;font-weight:600;color:#1A0D1F}
              .ds-branch-addr{margin:3px 0 0;font-size:12px;line-height:1.5;color:#6B7280}
              .ds-link{display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;font-weight:600;color:${BRAND};text-decoration:none}
              .ds-link:hover{text-decoration:underline}
              .ds-email-row{margin-top:20px;padding-top:16px;border-top:1px solid #F1ECF5;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:#6B7280}
              .ds-email{font-weight:500;color:#1A0D1F;text-decoration:none;word-break:break-all}
              .ds-email:hover{color:${BRAND};text-decoration:underline}
              @media (min-width:560px){
                .ds-wrap{padding:48px 24px}
                .ds-top{padding:16px 36px}
                .ds-main{padding:32px 36px 28px}
                .ds-foot{padding:24px 36px}
                .ds-h1{font-size:28px}
                .ds-p{font-size:15px}
                .ds-actions{flex-direction:row}
                .ds-btn{flex:1}
                .ds-branches{grid-template-columns:1fr 1fr;gap:0}
                .ds-branch-first{padding-right:24px;border-right:1px solid #F1ECF5}
                .ds-branch-second{padding-left:24px}
              }
            `,
          }}
        />
      </head>
      <body>
        <main className="ds-wrap">
          <div className="ds-card">
            <div aria-hidden className="ds-strip" />
            <div className="ds-top">
              <div className="ds-brand">
                <span className="ds-brand-mark" aria-hidden>
                  <svg width={18} height={18} viewBox="0 0 64 64" fill="none">
                    <path
                      d="M21 8C10.5 16.5 6.5 31 11.5 43.2C16.8 56 32 61.5 45.5 55.2C50.2 53 54 49.6 56.8 45.4C52.6 49.4 47.2 52 41 52.8C27.2 54.6 15.2 44.8 13.8 31.2C12.9 22.5 15.8 14.2 21 8Z"
                      fill="currentColor"
                    />
                    <path
                      d="M24.2 14.8C29.4 15.6 36.2 19.6 39.2 26.8C40.5 30 40.3 33.4 39.2 35.6C35.8 35.8 30.8 34.8 27 31.6C22.4 27.7 21.8 20.6 24.2 14.8Z"
                      fill="currentColor"
                    />
                    <path
                      d="M41.2 28.4C41.8 22.8 45.6 16.8 52.6 14.8C53.6 20.4 51.4 26.8 46.6 30.2C44.8 31.4 42.8 31.9 41.2 31.7C41 30.6 41 29.5 41.2 28.4Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span className="ds-brand-name">Dermaspace</span>
              </div>
              <span className="ds-tag">
                <span
                  aria-hidden
                  className={isOffline ? "ds-dot ds-dot-muted" : "ds-dot"}
                />
                {isOffline ? "Offline" : "Service notice"}
              </span>
            </div>

            <div className="ds-main">
              <div className="ds-icon" aria-hidden>
                {isOffline ? <OfflineGlyph /> : <AlertCircleGlyph />}
              </div>
              <h1 className="ds-h1">
                {isOffline ? "You\u2019re offline" : "Something went wrong"}
              </h1>
              <p className="ds-p">
                {isOffline
                  ? "Your connection dropped. Pages you\u2019ve already visited still work offline."
                  : "We hit an unexpected snag loading this page. It\u2019s on us, not you \u2014 a quick retry usually clears it right up."}
              </p>

              <div className="ds-actions">
                <button
                  type="button"
                  onClick={tryAgain}
                  className="ds-btn ds-btn-primary"
                >
                  Try again
                </button>
                <a href="/" className="ds-btn ds-btn-secondary">
                  Back to Home
                </a>
              </div>
            </div>

            <div className="ds-foot">
              <p className="ds-foot-title">Reach our sanctuaries</p>
              <div className="ds-branches">
                <div className="ds-branch-first">
                  <p className="ds-branch-name">Victoria Island</p>
                  <p className="ds-branch-addr">237B Muri Okunola St, VI</p>
                  <a href="tel:+2349061836625" className="ds-link">
                    +234 906 183 6625
                  </a>
                </div>
                <div className="ds-branch-second">
                  <p className="ds-branch-name">Ikoyi</p>
                  <p className="ds-branch-addr">
                    9 Agbeke Rotinwa Cl, Dolphin Estate
                  </p>
                  <a href="tel:+2349013134945" className="ds-link">
                    +234 901 313 4945
                  </a>
                </div>
              </div>
              <div className="ds-email-row">
                <span>Prefer email?</span>
                <a href="mailto:info@dermaspaceng.com" className="ds-email">
                  info@dermaspaceng.com
                </a>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}

function OfflineGlyph() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 8.82a15 15 0 0 1 20 0M5 12.86a10 10 0 0 1 14 0M8.5 16.43a5 5 0 0 1 7 0M12 20h.01M2 2l20 20"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AlertCircleGlyph() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} />
      <path
        d="M12 8v4M12 16h.01"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  )
}
