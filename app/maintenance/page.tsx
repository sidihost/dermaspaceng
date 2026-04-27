// ---------------------------------------------------------------------------
// /maintenance — splash served while an admin has flipped the maintenance
// flag in the admin console. The middleware redirects every non-admin,
// non-API request here, so this page is what the public sees during a
// downtime window.
//
// Design intent (this revision):
//   - The previous "compact white card on grey" treatment was
//     functional but felt like a 404. Maintenance pages are also a
//     brand moment: it's the only screen many users will see for the
//     window, so it should feel intentional and warm, not apologetic.
//   - Full-bleed soft brand-tinted gradient page background with a
//     pair of large blurred orbs as ambient decoration — they read
//     as atmosphere, not graphics, and stay well behind the card so
//     they never compete with copy.
//   - Hero card: rounded-3xl with a subtle ring + soft elevation
//     instead of a hairline border. A purple accent bar across the
//     top still anchors brand presence on the card edge.
//   - Icon tile is upgraded to a layered gradient + a slow floating
//     animation, with two soft pulsing rings to communicate
//     "something is happening" rather than "page is broken".
//   - Clear hierarchy: small eyebrow pill ("Scheduled maintenance")
//     → big balanced headline → plain-language body → optional ETA
//     pill with pulsing dot → primary action ("Try again") +
//     secondary action ("Go to homepage") → a hairline divider →
//     a single warm support row with both phone + email so users
//     can reach a human on whichever they prefer.
//   - Reads the live maintenance settings on each request so an
//     admin updating the message sees it without a deploy.
//
// The page is pure CSS — no client-side JS — because middleware
// redirects to it on every request, so SSR + a hard reload via the
// "Try again" link is enough; we don't want to ship a hydration
// payload to a route the user is supposed to leave shortly.
// ---------------------------------------------------------------------------

import Link from 'next/link'
import { Sparkles, Phone, Mail, RefreshCw, ArrowUpRight } from 'lucide-react'
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
    <main className="relative min-h-[100svh] overflow-hidden bg-[#FAF6FB]">
      {/* Ambient decoration — two large, very-soft brand orbs that
          live behind the card. Pure CSS, position: absolute, with a
          heavy blur so they read as atmosphere rather than shapes.
          Pointer events off so they never block clicks. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-[#7B2D8E]/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 w-[26rem] h-[26rem] rounded-full bg-[#E9C8F0]/40 blur-3xl"
      />
      {/* Faint dot grid for subtle texture — uses the brand purple
          at very low opacity so it shows up on the page background
          but disappears entirely behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(123,45,142,0.10) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="relative min-h-[100svh] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Brand wordmark above the card — gives the page a
              "Dermaspace says hi" feel before the headline lands.
              Kept tiny + uppercase so it never competes with the
              card's own headline hierarchy. */}
          <div className="mb-5 flex items-center justify-center gap-2">
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]"
            />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#7B2D8E]">
              Dermaspace
            </span>
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]"
            />
          </div>

          <div className="relative bg-white rounded-3xl ring-1 ring-black/5 shadow-[0_30px_80px_-30px_rgba(123,45,142,0.35)] overflow-hidden">
            {/* Brand strip — the only place purple touches the card
                edge. Gradient stop is intentionally subtle. */}
            <div
              aria-hidden
              className="h-1 bg-gradient-to-r from-[#7B2D8E] via-[#A855B6] to-[#7B2D8E]"
            />

            <div className="px-6 sm:px-8 pt-8 pb-8 text-center">
              {/* Icon tile — layered for depth: two pulsing rings
                  underneath, then the gradient tile with a slow
                  float, and a Sparkles glyph on top. */}
              <div className="relative mx-auto w-20 h-20">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-3xl bg-[#7B2D8E]/10 ds-pulse-ring"
                />
                <span
                  aria-hidden
                  className="absolute inset-2 rounded-2xl bg-[#7B2D8E]/15 ds-pulse-ring-delayed"
                />
                <div className="absolute inset-3 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] flex items-center justify-center shadow-[0_10px_25px_-8px_rgba(123,45,142,0.55)] ds-float">
                  <Sparkles className="w-6 h-6 text-white" aria-hidden />
                </div>
              </div>

              {/* Eyebrow — keeps users oriented: this isn't a 500,
                  it's a planned pause. */}
              <div className="mt-6 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2D8E]/[0.08] text-[#7B2D8E] text-[11px] font-semibold uppercase tracking-wider">
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-pulse"
                />
                Scheduled maintenance
              </div>

              <h1 className="mt-3 text-[26px] sm:text-[30px] leading-[1.15] font-semibold text-gray-900 tracking-tight text-balance">
                We&apos;re polishing things up
              </h1>
              <p className="mt-3 text-[14.5px] text-gray-600 leading-relaxed text-pretty">
                {settings.message}
              </p>

              {eta && (
                <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-[#7B2D8E]/20 text-[#7B2D8E]">
                  <span className="relative flex w-2 h-2">
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-[#7B2D8E] opacity-60 animate-ping"
                    />
                    <span
                      aria-hidden
                      className="relative w-2 h-2 rounded-full bg-[#7B2D8E]"
                    />
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums">
                    Back by {eta}
                  </span>
                </div>
              )}

              {/* Primary + secondary actions */}
              <div className="mt-7 grid gap-2.5">
                {/* Hard reload via plain anchor so middleware
                    re-evaluates and lets the user through if
                    maintenance has been turned off. */}
                <a
                  href="/"
                  className="group inline-flex items-center justify-center gap-2 h-11 rounded-full bg-[#7B2D8E] text-white text-[14px] font-semibold hover:bg-[#5A1D6A] transition-colors shadow-[0_8px_20px_-8px_rgba(123,45,142,0.6)]"
                >
                  <RefreshCw className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" aria-hidden />
                  Try again
                </a>
                <Link
                  href="/locations"
                  className="inline-flex items-center justify-center gap-2 h-11 rounded-full bg-white border border-gray-200 text-[14px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
                >
                  Visit a branch instead
                  <ArrowUpRight className="w-4 h-4" aria-hidden />
                </Link>
              </div>

              {/* Hairline divider with a "or reach us directly" note */}
              <div className="mt-7 mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                <span className="flex-1 h-px bg-gray-100" />
                Need us right now
                <span className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Support row — phone + email side by side. Both are
                  tappable as native intents on mobile. */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:+2349017972919"
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-gray-50 hover:bg-[#7B2D8E]/[0.06] transition-colors group"
                >
                  <span className="w-8 h-8 rounded-xl bg-white border border-gray-100 group-hover:border-[#7B2D8E]/30 flex items-center justify-center transition-colors">
                    <Phone className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Call us
                  </span>
                  <span className="text-[12.5px] font-semibold text-gray-900 tabular-nums">
                    +234 901 797 2919
                  </span>
                </a>
                <a
                  href="mailto:support@dermaspaceng.com"
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-gray-50 hover:bg-[#7B2D8E]/[0.06] transition-colors group"
                >
                  <span className="w-8 h-8 rounded-xl bg-white border border-gray-100 group-hover:border-[#7B2D8E]/30 flex items-center justify-center transition-colors">
                    <Mail className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Email us
                  </span>
                  <span className="text-[12px] font-semibold text-gray-900 truncate w-full text-center">
                    support@dermaspaceng.com
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Tagline below the card — reinforces the "we're still
              here, this is just a quick pause" tone. */}
          <p className="mt-5 text-center text-[12px] text-gray-500">
            Back to your glow in just a moment.
          </p>
        </div>
      </div>

      {/* Page-local keyframes. Kept inline so the maintenance route
          ships zero client JS and zero global CSS bloat. */}
      <style>{`
        @keyframes ds-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ds-pulse-ring {
          0% { transform: scale(0.95); opacity: 0.7; }
          70% { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        .ds-float { animation: ds-float 4s ease-in-out infinite; }
        .ds-pulse-ring { animation: ds-pulse-ring 2.4s ease-out infinite; }
        .ds-pulse-ring-delayed { animation: ds-pulse-ring 2.4s ease-out 1.2s infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ds-float, .ds-pulse-ring, .ds-pulse-ring-delayed { animation: none; }
        }
      `}</style>
    </main>
  )
}
