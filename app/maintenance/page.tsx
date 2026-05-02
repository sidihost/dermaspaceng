// ---------------------------------------------------------------------------
// /maintenance — splash served while an admin has flipped the maintenance
// flag in the admin console. The middleware redirects every non-admin,
// non-API request here, so this page is what the public sees during a
// downtime window.
//
// Design intent (this revision):
//   - Previous revision leaned into a marketing-splash treatment — full-
//     bleed brand-tinted gradient page background, two large blurred
//     orbs, a faint dot-grid texture, layered pulsing rings around the
//     icon, a floating animation, an eyebrow chip, a wordmark above
//     the card and a tagline below it. The team's note was that it
//     read as "too much" for a system page; what they wanted was
//     "normal spacing like big tech companies would do it" — i.e.
//     Stripe / Vercel / GitHub status pages: clean white-ish
//     background, one calm card, tight type, minimal motion.
//   - This revision keeps the brand vocabulary (purple #7B2D8E accent
//     strip, gentle off-white page bg, rounded card, support row) but
//     drops every piece of non-load-bearing decoration: no orbs, no
//     dot grid, no pulse rings, no float animation, no eyebrow chip,
//     no wordmark, no tagline, no pulsing ETA dot ring.
//   - Spacing is dialled in tighter and consistent with the other
//     offline / paused states (offline route + SW shell), so the
//     three pages feel like one family.
//   - Reads the live maintenance settings on each request so an admin
//     updating the message sees it without a deploy.
//
// The page is pure CSS — no client-side JS — because middleware
// redirects to it on every request, so SSR + a hard reload via the
// "Try again" link is enough; we don't want to ship a hydration
// payload to a route the user is supposed to leave shortly.
// ---------------------------------------------------------------------------

import Link from 'next/link'
import { Sparkles, Phone, Mail, RefreshCw } from 'lucide-react'
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
    <main className="min-h-[100svh] flex items-center justify-center bg-[#FAF6FB] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_10px_30px_-12px_rgba(123,45,142,0.18)] overflow-hidden">
          {/* Brand strip — single accent that ties the card to the rest
              of the offline / paused state family. */}
          <div aria-hidden className="h-[3px] bg-[#7B2D8E]" />

          <div className="px-6 sm:px-7 pt-6 pb-6 text-center">
            <div className="w-11 h-11 mx-auto rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
            </div>

            <h1 className="mt-3.5 text-[20px] leading-[1.25] font-semibold tracking-tight text-gray-900 text-balance">
              We&apos;re down for maintenance
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-600 text-pretty">
              {settings.message}
            </p>

            {eta && (
              <p className="mt-3 text-[12px] font-medium text-[#7B2D8E] tabular-nums">
                Back by {eta}
              </p>
            )}

            {/* Primary + secondary actions — same shape and rhythm as
                the offline route so users feel they're in the same
                product, not on a different system page. */}
            <div className="mt-5 grid gap-2">
              <a
                href="/"
                className="inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-[#7B2D8E] text-white text-[13.5px] font-semibold hover:bg-[#6B2D7E] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden />
                Try again
              </a>
              <Link
                href="/locations"
                className="inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-white border border-gray-200 text-[13.5px] font-semibold text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors"
              >
                Visit a branch
              </Link>
            </div>

            {/* Hairline + contact strip — matches /offline so the two
                pages feel like the same system. Phone + email kept
                inline, no decorative tiles. */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-5 text-[12.5px]">
              <a
                href="tel:+2349017972919"
                className="inline-flex items-center gap-1.5 font-semibold text-[#7B2D8E] hover:underline"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden />
                +234 901 797 2919
              </a>
              <a
                href="mailto:support@dermaspaceng.com"
                className="inline-flex items-center gap-1.5 font-semibold text-[#7B2D8E] hover:underline"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden />
                Email us
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
