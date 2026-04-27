// ---------------------------------------------------------------------------
// /maintenance — splash served while an admin has flipped the maintenance
// flag in the admin console. The middleware redirects every non-admin,
// non-API request here, so this page is what the public sees during a
// downtime window.
//
// Design intent (this revision):
//   - One viewport, no scroll. The card is intentionally compact —
//     icon tile + headline + one line of body + ETA pill + support
//     row — so it fits inside a 360×640 phone without overflowing
//     even when the browser chrome is on screen. Earlier versions
//     stacked a logo + wrench + headline + body + ETA + divider +
//     two contact rows, which pushed everything off the bottom edge.
//   - Matches the `/laser-tech` maintenance treatment: solid neutral
//     page background (no gradient), white card with a hairline
//     border (no heavy purple drop-shadow), and a thin brand strip
//     across the top of the card as the only purple accent. The
//     gradient + shadow combo we had before competed with the
//     content and looked heavier than the rest of the site.
//   - No logo inside the card. The brand identity is carried by the
//     purple strip + accent on the icon tile + the email link, which
//     is enough — repeating the wordmark on a card that lives at the
//     same domain was redundant.
//   - Reads the live maintenance settings on each request so an
//     admin updating the message sees it without a deploy.
// ---------------------------------------------------------------------------

import Link from 'next/link'
import { Wrench, Mail, RefreshCw } from 'lucide-react'
import { getMaintenance } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatEta(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString('en-NG', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export default async function MaintenancePage() {
  const settings = await getMaintenance()
  const eta = formatEta(settings.eta)

  return (
    <main className="min-h-[100svh] bg-[#FAF6FB] flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
          {/* Brand strip — the only place purple touches the card edge.
              Using a solid 1px-tall plum bar rather than a gradient so
              it reads as a calm accent, not a hero band. */}
          <div className="h-1 bg-[#7B2D8E]" aria-hidden />

          <div className="px-6 py-7 text-center">
            {/* Wrench icon tile — purple-on-purple soft fill, same
                visual treatment as the /laser-tech card so the two
                maintenance surfaces feel like siblings. */}
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
            </div>

            <h1 className="mt-4 text-xl font-bold text-gray-900 tracking-tight text-balance">
              Just a moment
            </h1>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed text-pretty">
              {settings.message}
            </p>

            {eta && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] border border-[#7B2D8E]/15">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-pulse"
                  aria-hidden
                />
                <span className="text-[12px] font-semibold tabular-nums">
                  Back by {eta}
                </span>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              {/* Primary action — hard reload via plain anchor so the
                  middleware re-evaluates and lets the user through if
                  maintenance has been turned off in the meantime. A
                  router.push() wouldn't re-run middleware. */}
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 h-10 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2D7E] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden />
                Try again
              </a>
              {/* Secondary action — single inline support link. The
                  previous version had a divider, an uppercase eyebrow
                  ("NEED HELP RIGHT NOW?"), and a stacked email link;
                  collapsing it into one row recovers ~80px of vertical
                  space and is the difference between fitting and
                  scrolling on most phones. */}
              <Link
                href="mailto:support@dermaspaceng.com"
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#7B2D8E] transition-colors"
              >
                <Mail className="w-3 h-3" aria-hidden />
                support@dermaspaceng.com
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
