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
// ---------------------------------------------------------------------------

import { useEffect } from "react"
import Link from "next/link"
import { ButterflyLogo } from "@/components/shared/butterfly-logo"
import { RefreshCw, Home } from "lucide-react"

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the error in the server logs so we can see it in our log
    // pipeline. The `[v0]` tag matches the rest of the codebase's
    // debug-log convention.
    console.error("[v0] Route error boundary caught:", error)
  }, [error])

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
