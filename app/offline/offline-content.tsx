'use client'

import { WifiOff, RefreshCw, Home, Phone } from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// /offline — the React-rendered offline route. Distinct from the inline
// OFFLINE_HTML shell in sw.js (which serves when fetch() rejects entirely);
// this page is reachable via direct navigation and acts as the "I tried to
// open something that wasn't cached, here's what I can still do" landing.
//
// Design notes:
//   - Mirrors the same compact card system as the SW shell and the
//     maintenance page so all three offline / paused states feel like
//     one family.
//   - Centred on every viewport (the previous version was bottom-anchored
//     on mobile because it only enabled flex centring at the lg
//     breakpoint, which read as "broken layout"). 100svh keeps the card
//     vertically centred even when the mobile URL bar collapses.
//   - Spacing dialled in tighter — the previous version had a lot of
//     stacked margin-bottoms; this revision uses a single grid with gap-3
//     between sections so the card feels like one cohesive object.
// ---------------------------------------------------------------------------

export default function OfflineContent() {
  return (
    <main className="min-h-[100svh] flex items-center justify-center bg-[#FAF6FB] px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_10px_30px_-12px_rgba(123,45,142,0.18)] overflow-hidden text-center">
          {/* Brand strip — matches /maintenance and the SW offline shell */}
          <div aria-hidden className="h-[3px] bg-[#7B2D8E]" />

          <div className="px-6 pt-6 pb-6">
            <div className="w-11 h-11 mx-auto rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
            </div>

            <h1 className="mt-3.5 text-lg font-semibold tracking-tight text-gray-900">
              You&apos;re offline
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-600 text-pretty">
              Some access might be limited until you&apos;re reconnected. Pages you&apos;ve already visited will keep working.
            </p>

            {/* Primary + secondary actions */}
            <div className="mt-4 grid gap-2">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-[#7B2D8E] text-white text-[13.5px] font-semibold hover:bg-[#6B2D7E] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden />
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-white border border-gray-200 text-[13.5px] font-semibold text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors"
              >
                <Home className="w-3.5 h-3.5" aria-hidden />
                Continue to homepage
              </Link>
            </div>

            {/* Hairline + contact strip */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <a
                href="tel:+2349017972919"
                className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-[#7B2D8E] hover:underline"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden />
                +234 901 797 2919
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
