'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Lock,
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Headphones,
  ShieldCheck,
  Compass,
  Cake,
  type LucideIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Preloader
// ---------------------------------------------------------------------------
// First-paint splash shown for ~2 seconds on every full page load (root
// layout mount only — client-side route changes do NOT remount the
// layout, so this does not flash on internal navigation).
//
// Two changes from the previous version:
//   1. Route-aware copy: instead of a silent logo, the splash announces
//      the *intent* of the navigation. "Connecting securely" while the
//      auth pages mount, "Loading your dashboard" on /dashboard, etc.
//      Pattern lifted from how Google / Stripe / Notion communicate
//      what's happening during the first paint instead of just spinning.
//   2. A small icon + label sit beside the brand mark so the message
//      reads like a status, not a tagline.
//
// Routes are resolved by longest-prefix match against pathname so a
// rule for `/admin` automatically applies to every nested admin page
// without having to enumerate them.
// ---------------------------------------------------------------------------

interface RouteIntent {
  prefix: string
  label: string
  icon: LucideIcon
}

// Order matters: more specific prefixes first. We pick the FIRST match
// instead of the longest for predictability — if the auth funnel ever
// gets nested under another path (e.g. /onboarding/signin) we want to
// add a single more-specific rule above the general /signin one,
// rather than rely on path-length tie-breaking.
const ROUTE_INTENTS: RouteIntent[] = [
  { prefix: '/birthday',         label: 'Loading your Glow Year',           icon: Cake },
  { prefix: '/signin',           label: 'Connecting securely',              icon: Lock },
  { prefix: '/signup',           label: 'Setting things up',                icon: Sparkles },
  { prefix: '/forgot-password',  label: 'Connecting securely',              icon: Lock },
  { prefix: '/reset-password',   label: 'Connecting securely',              icon: Lock },
  { prefix: '/verify-email',     label: 'Confirming your email',            icon: ShieldCheck },
  { prefix: '/booking',          label: 'Loading available slots',          icon: CalendarDays },
  { prefix: '/services',         label: 'Loading our menu',                 icon: Sparkles },
  { prefix: '/branches',         label: 'Finding nearby branches',          icon: Compass },
  { prefix: '/dashboard',        label: 'Loading your dashboard',           icon: LayoutDashboard },
  { prefix: '/admin/live-chat',  label: 'Connecting to the chat console',   icon: Headphones },
  { prefix: '/staff/live-chat',  label: 'Connecting to the chat console',   icon: Headphones },
  { prefix: '/admin',            label: 'Loading admin console',            icon: ShieldCheck },
  { prefix: '/staff',            label: 'Loading staff console',            icon: ShieldCheck },
  { prefix: '/profile',          label: 'Loading your profile',             icon: LayoutDashboard },
  { prefix: '/blog',             label: 'Fetching the latest reads',        icon: Sparkles },
]

const DEFAULT_INTENT: RouteIntent = {
  prefix: '/',
  label: 'Welcome to Dermaspace',
  icon: Sparkles,
}

function resolveIntent(pathname: string): RouteIntent {
  for (const r of ROUTE_INTENTS) {
    if (pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)) return r
  }
  return DEFAULT_INTENT
}

export default function Preloader() {
  const pathname = usePathname() ?? '/'
  // Capture the route at MOUNT only. Client-side navigation must not
  // re-show the splash — we already gate on a single mount lifecycle,
  // and `useMemo([])` guarantees the same intent string for the
  // entire splash duration even if a quick redirect rewrites the URL
  // mid-fade.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const intent = useMemo(() => resolveIntent(pathname), [])

  const [isLoading, setIsLoading] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const fade = window.setTimeout(() => setFadeOut(true), 1700)
    const hide = window.setTimeout(() => setIsLoading(false), 2200)
    return () => {
      window.clearTimeout(fade)
      window.clearTimeout(hide)
    }
  }, [])

  if (!isLoading) return null

  const Icon = intent.icon

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center px-6">
        <div className="relative">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
            alt="Dermaspace"
            width={180}
            height={60}
            className="h-12 sm:h-14 w-auto"
            priority
          />
        </div>

        {/* Status label — icon + copy + animated three-dot ellipsis.
            Sits in a soft brand-tinted pill so it reads as a system
            status rather than a static tagline. The dots animate
            continuously so even on a cold fetch the splash never
            looks stuck. */}
        <div className="mt-5 flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/[0.06] text-[#5A1D6A]">
          <Icon className="h-4 w-4" aria-hidden />
          <span className="text-[13px] font-semibold">{intent.label}</span>
          <span className="inline-flex items-end gap-0.5 ml-0.5" aria-hidden>
            <span className="dot dot-1">.</span>
            <span className="dot dot-2">.</span>
            <span className="dot dot-3">.</span>
          </span>
        </div>

        <div className="mt-5 w-44 h-0.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#7B2D8E] rounded-full animate-loading-bar" />
        </div>

        <span className="sr-only">{intent.label}</span>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 2s ease-out forwards;
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
        .dot {
          display: inline-block;
          font-weight: 700;
          line-height: 1;
          animation: dot-bounce 1.2s infinite ease-in-out both;
        }
        .dot-1 { animation-delay: 0s; }
        .dot-2 { animation-delay: 0.18s; }
        .dot-3 { animation-delay: 0.36s; }
      `}</style>
    </div>
  )
}
