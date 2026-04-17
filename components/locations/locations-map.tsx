'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  Home,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useUserPersonalization } from '@/hooks/use-user-personalization'

// Leaflet has no SSR, so we dynamically import it on the client only. A tiny
// inline fallback keeps the page from visibly "popping" while the bundle loads.
const InteractiveMap = dynamic(
  () => import('@/components/home/interactive-map'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-[#7B2D8E] text-xs font-medium">
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce" />
          </span>
          Preparing your map
        </div>
      </div>
    ),
  }
)

// WhatsApp logo SVG — reused from other contact surfaces so the look stays
// consistent wherever we link to a branch's WhatsApp line.
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

type BranchId = 'vi' | 'ikoyi'

interface Branch {
  id: BranchId
  name: string
  address: string
  phone: string
  whatsapp: string
  hours: string
}

// Kept in sync with InteractiveMap's BRANCHES constant — we don't need the
// lat/lng here since the map component owns that, but the details must match.
const BRANCHES: Branch[] = [
  {
    id: 'vi',
    name: 'Victoria Island',
    address: '237B Muri Okunola Street, VI, Lagos',
    phone: '+234 906 183 6625',
    whatsapp: '+2349061836625',
    hours: 'Mon – Sat: 9am – 7pm',
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    address: '44A, Awolowo Road, Ikoyi, Lagos',
    phone: '+234 901 313 4945',
    whatsapp: '+2349013134945',
    hours: 'Mon – Sat: 9am – 7pm',
  },
]

// Map the free-form `preferredLocation` preference value (could be a pretty
// name like "Victoria Island" or a slug like "vi") to a canonical branch id.
function toBranchId(value?: string | null): BranchId | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('vi') || v.includes('victoria')) return 'vi'
  if (v.includes('ikoyi')) return 'ikoyi'
  return null
}

export default function LocationsMap() {
  const { user, preferences, isLoggedIn } = useUserPersonalization()

  // Preferred branch derived from DB preferences; falls back to VI for guests.
  const preferredId = toBranchId(preferences?.preferredLocation)
  const [activeId, setActiveId] = useState<BranchId>(preferredId ?? 'vi')

  // Keep activeId in sync if preferences load after first paint (SWR revalidate).
  useEffect(() => {
    if (preferredId) setActiveId(preferredId)
  }, [preferredId])

  const activeBranch = useMemo(
    () => BRANCHES.find((b) => b.id === activeId) || BRANCHES[0],
    [activeId]
  )
  const otherBranch = useMemo(
    () => BRANCHES.find((b) => b.id !== activeId) || BRANCHES[1],
    [activeId]
  )

  // Whether the user has a saved home branch — this is what drives the
  // personalised hero above the map.
  const isPersonalised = isLoggedIn && Boolean(preferredId)

  return (
    <main className="relative flex flex-col bg-white">
      {/* ------------------------------------------------------------------
          Personalised hero — different content for guests vs signed-in users
          with a preferred branch. We keep the structure identical (eyebrow,
          heading, supporting text) so the page rhythm stays the same.
         ------------------------------------------------------------------ */}
      <section className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2D8E]/10 mb-2">
                {isPersonalised ? (
                  <>
                    <Home className="w-3 h-3 text-[#7B2D8E]" />
                    <span className="text-[10px] font-semibold text-[#7B2D8E] uppercase tracking-widest">
                      Your home spa
                    </span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3 text-[#7B2D8E]" />
                    <span className="text-[10px] font-semibold text-[#7B2D8E] uppercase tracking-widest">
                      Find us
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight text-balance">
                {isPersonalised ? (
                  <>
                    {user?.firstName ? `${user.firstName}, your spa is` : 'Your spa is'}{' '}
                    <span className="text-[#7B2D8E]">{activeBranch.name}</span>
                  </>
                ) : (
                  <>
                    Visit <span className="text-[#7B2D8E]">Dermaspace</span> in Lagos
                  </>
                )}
              </h1>

              <p className="mt-1 text-xs sm:text-sm text-gray-600 max-w-lg text-pretty">
                {isPersonalised
                  ? 'Live directions from wherever you are, plus a one-tap route into the salon.'
                  : 'Two locations in Lagos. Tap a pin to switch branches or use the directions button to get live navigation.'}
              </p>
            </div>

            {/* Quick CTA — on desktop this sits beside the title; on mobile
                it drops below. For guests it invites them to sign in for
                the personalised experience. */}
            {isPersonalised ? (
              <Link
                href="/booking"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#6B2278] transition-colors flex-shrink-0"
              >
                Book at {activeBranch.name}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/signin"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full hover:bg-[#7B2D8E]/20 transition-colors flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sign in for a personalised map
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Full-height interactive map. We lock the height to a CSS calc so
          the map always fills the viewport below the site header (roughly
          4rem) and the small hero above (roughly 7rem), with a sensible
          minimum so short viewports still show a meaningful map.
          ------------------------------------------------------------------ */}
      <section className="relative">
        <div
          className="relative w-full"
          style={{ height: 'min(720px, max(420px, calc(100vh - 12rem)))' }}
        >
          <InteractiveMap
            activeBranchId={activeId}
            onSelectBranch={setActiveId}
            height="100%"
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Branch details + contact strip. Below the map so users can scroll
          to call, WhatsApp or get directions without needing to interact
          with the map itself.
          ------------------------------------------------------------------ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Contact a branch
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {BRANCHES.map((b) => {
            const isActive = b.id === activeId
            return (
              <div
                key={b.id}
                className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
                  isActive
                    ? 'border-[#7B2D8E]/30 bg-[#7B2D8E]/[0.03]'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-[#7B2D8E] uppercase tracking-widest">
                      Dermaspace
                    </p>
                    <h3 className="text-base font-bold text-gray-900 truncate">
                      {b.name}
                    </h3>
                  </div>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E] text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 flex-shrink-0">
                      <Home className="w-2.5 h-2.5" />
                      Selected
                    </span>
                  )}
                </div>

                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-xs text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                    <span>{b.address}</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
                    <a
                      href={`tel:${b.phone}`}
                      className="hover:text-[#7B2D8E] transition-colors"
                    >
                      {b.phone}
                    </a>
                  </li>
                  <li className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
                    <span>{b.hours}</span>
                  </li>
                </ul>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => setActiveId(b.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7B2D8E] bg-white ring-1 ring-[#7B2D8E]/20 rounded-lg hover:bg-[#7B2D8E]/5 transition-colors"
                    >
                      Show on map
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  <a
                    href={`https://wa.me/${b.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#7B2D8E] rounded-lg hover:bg-[#6B2278] transition-colors"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    Chat
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-lg hover:bg-[#7B2D8E]/20 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Directions
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        {/* Nudge to sign in for guests — sits right under the branch cards. */}
        {!isLoggedIn && (
          <div className="mt-4 rounded-xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/5 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-[#7B2D8E]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Save your home spa
              </p>
              <p className="text-xs text-gray-600">
                Sign in to pick a preferred branch and get directions tailored
                to you.
              </p>
            </div>
            <Link
              href="/signin"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#6B2278] transition-colors flex-shrink-0"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* Alternate branch shortcut when personalised */}
        {isPersonalised && (
          <p className="mt-4 text-center text-xs text-gray-500">
            Prefer the other side of town?{' '}
            <button
              type="button"
              onClick={() => setActiveId(otherBranch.id)}
              className="font-semibold text-[#7B2D8E] hover:underline"
            >
              Switch to {otherBranch.name}
            </button>
          </p>
        )}
      </section>
    </main>
  )
}
