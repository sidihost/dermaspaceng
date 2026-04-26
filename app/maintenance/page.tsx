// ---------------------------------------------------------------------------
// /maintenance — splash served while an admin has flipped the maintenance
// flag in the admin console. The middleware redirects every non-admin,
// non-API request here, so this page is what the public sees during a
// downtime window.
//
// Design intent:
//   - Brand-only palette (purple #7B2D8E + neutrals). No emerald
//     "All systems normal" green that the admin status page uses;
//     this is a "we're working on it" surface.
//   - One screen, no scroll. Centred logo, headline, custom message,
//     optional ETA, support link.
//   - Reads the live maintenance settings on each request so an
//     admin updating the message sees it without a deploy.
// ---------------------------------------------------------------------------

import Image from 'next/image'
import Link from 'next/link'
import { Wrench, Mail, ArrowLeft } from 'lucide-react'
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
    <main className="min-h-screen bg-gradient-to-b from-[#7B2D8E] to-[#5A1D6A] flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl shadow-[#7B2D8E]/30 overflow-hidden">
          {/* Brand strip */}
          <div className="h-1 bg-[#7B2D8E]" aria-hidden />

          <div className="px-6 pt-7 pb-6 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-5">
              <Image
                src="/logo.png"
                alt="Dermaspace"
                width={180}
                height={40}
                priority
                className="h-9 w-auto"
              />
            </div>

            {/* Wrench icon — purple-on-purple soft tile, calmer than a
                full filled circle. */}
            <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#7B2D8E]" aria-hidden />
            </div>

            <h1 className="text-xl font-bold text-gray-900 tracking-tight text-balance">
              Just a moment
            </h1>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed text-pretty">
              {settings.message}
            </p>

            {eta && (
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/8 text-[#7B2D8E] border border-[#7B2D8E]/15">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-pulse" aria-hidden />
                <span className="text-[12px] font-semibold tabular-nums">
                  Expected back: {eta}
                </span>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-[11.5px] uppercase tracking-[0.18em] font-bold text-gray-400 mb-2">
                Need help right now?
              </p>
              <Link
                href="mailto:support@dermaspaceng.com"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#7B2D8E] hover:underline"
              >
                <Mail className="w-4 h-4" aria-hidden />
                support@dermaspaceng.com
              </Link>
            </div>
          </div>
        </div>

        {/* Subtle "Try again" affordance — reload the same URL. We use
            an anchor instead of a router push because the user might
            have landed here mid-navigation; a hard reload re-runs the
            middleware check and lets them through if maintenance has
            since been disabled. */}
        <div className="mt-5 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-3 h-3" aria-hidden />
            Try again
          </a>
        </div>
      </div>
    </main>
  )
}
