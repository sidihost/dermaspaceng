'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  X,
  ArrowRight,
  Search,
  TrendingUp,
  Flower2,
  Bath,
  Droplets,
  Gift,
  Heart,
  Shell,
  FileText,
  MessageCircleQuestion,
  CalendarCheck,
  User,
  Images,
  Leaf,
  Settings,
  Wallet,
  Clock,
  Loader2,
  Sparkles,
  LogOut,
  CalendarClock,
  Star,
  LayoutDashboard,
} from 'lucide-react'

// Semantic search hits returned by /api/search/semantic. Same shape
// the desktop SemanticServiceSearch component uses — keeping them in
// sync means we get treatment, category and blog matches for free.
interface SemanticHit {
  kind: 'service' | 'service-category' | 'blog' | 'faq'
  title: string
  summary: string | null
  url: string
  score: number
  tags: string[]
  priceFrom: string | null
  duration: string | null
}

const KIND_LABEL: Record<SemanticHit['kind'], string> = {
  service: 'Treatment',
  'service-category': 'Category',
  blog: 'Tip',
  faq: 'FAQ',
}

interface UserData {
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string | null
}

/**
 * Mobile bottom navigation.
 *
 * Layout (left → right):
 *   Home · Services (drop-up) · Search (centre elevated) · Book · Profile
 *
 * The Profile slot swaps between:
 *   - Signed-in: a live avatar wrapped in a purple ring (matches the
 *     Gemini profile affordance the product team asked for). Tapping
 *     it opens a quick profile sheet with dashboard / wallet / settings
 *     / sign out — same surface as the header dropdown so users don't
 *     have to mentally switch between two menus.
 *   - Signed-out: a "Sign in" pill icon that routes to /signin.
 *
 * Services is a drop-up sheet (not a new page) so users can jump to
 * any category / survey / consultation without losing their scroll
 * position on the current page.
 */
export default function MobileNav() {
  // `usePathname()` can return `null` (pre-hydration, mid-transition).
  // Fall back to '' so the downstream `.startsWith()` calls don't
  // crash the whole client tree, which was white-screening the site
  // on production.
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [semanticResults, setSemanticResults] = useState<SemanticHit[] | null>(null)
  const [semanticLoading, setSemanticLoading] = useState(false)
  // Track the latest in-flight semantic request so a slow response
  // can never overwrite a fresher one. Same pattern the standalone
  // SemanticServiceSearch on /services uses.
  const latestSearchRef = useRef(0)
  const [showServices, setShowServices] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Hydrate user — reuse the same endpoint the header uses so both
  // surfaces stay in sync. Listen for the app-wide 'user-updated'
  // event so avatar changes reflect without a page reload.
  useEffect(() => {
    let cancelled = false
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setUser(data.user ?? null)
        } else {
          setUser(null)
        }
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    }
    fetchUser()
    const onUpdate = () => fetchUser()
    window.addEventListener('user-updated', onUpdate)
    return () => {
      cancelled = true
      window.removeEventListener('user-updated', onUpdate)
    }
  }, [])

  // Lock body scroll while any of the sheets are open so the
  // content underneath doesn't "peek" on overscroll.
  useEffect(() => {
    const anyOpen = showSearch || showServices || showProfile
    if (anyOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [showSearch, showServices, showProfile])

  // Debounced semantic search. Fires /api/search/semantic 280ms after
  // the user stops typing — we use the same backend the /services AI
  // search uses, so a query like "breakouts before my period" surfaces
  // relevant treatments and blog tips by *meaning*, not keyword. Short
  // / empty queries clear the panel without firing a request.
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!showSearch || trimmed.length < 2) {
      setSemanticResults(null)
      setSemanticLoading(false)
      return
    }
    const requestId = Date.now()
    latestSearchRef.current = requestId
    setSemanticLoading(true)
    const handle = setTimeout(async () => {
      try {
        const res = await fetch('/api/search/semantic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: trimmed,
            limit: 8,
            kinds: ['service', 'service-category', 'blog'],
          }),
        })
        if (!res.ok) throw new Error('search failed')
        const data = (await res.json()) as { results?: SemanticHit[] }
        if (latestSearchRef.current !== requestId) return
        setSemanticResults(data.results ?? [])
      } catch {
        if (latestSearchRef.current !== requestId) return
        setSemanticResults([])
      } finally {
        if (latestSearchRef.current === requestId) {
          setSemanticLoading(false)
        }
      }
    }, 280)
    return () => clearTimeout(handle)
  }, [searchQuery, showSearch])

  // Quick-tap shortcuts shown when the user hasn't typed anything.
  // We deliberately keep this list short and text-only — pictures
  // turned the search sheet into a busy storefront, when what users
  // actually want is a fast type-then-go surface. If the typed query
  // doesn't match a treatment in the catalog, the semantic search
  // (powered by Upstash Vector via `/api/search/semantic`) takes over
  // and surfaces matches by *meaning*, not keyword.
  const searchItems = [
    { name: 'Laser Tech', href: '/laser-tech', tag: 'Advanced' },
    { name: 'Laser Hair Removal', href: '/laser-tech', tag: 'Popular' },
    { name: 'Facial Treatments', href: '/services/facial-treatments', tag: 'Popular' },
    { name: 'Body Treatments', href: '/services/body-treatments', tag: 'Relaxing' },
    { name: 'Nail Care', href: '/services/nail-care', tag: null },
    { name: 'Waxing', href: '/services/waxing', tag: null },
    { name: 'Packages', href: '/packages', tag: 'Best Value' },
    { name: 'Book Appointment', href: '/booking', tag: null },
    { name: 'Membership', href: '/membership', tag: 'VIP' },
    { name: 'Free Consultation', href: '/consultation', tag: null },
  ]

  // Services drop-up sheet entries. Grouped so the CTA-critical
  // conversion links (Consult, Survey) live inside a dedicated
  // "Personal" row at the top; treatments live below it, and
  // lifestyle links (Membership, Gift Cards, Gallery) are last.
  const servicesGroups = [
    {
      title: 'For you',
      items: [
        { name: 'Free Consultation', href: '/consultation', desc: 'Talk to an expert', icon: CalendarCheck, accent: true },
        { name: 'Skin Survey', href: '/survey', desc: 'Personalize your care', icon: FileText, accent: true },
      ],
    },
    {
      title: 'Treatments',
      items: [
        { name: 'Facial Treatments', href: '/services/facial-treatments', desc: 'Glow & rejuvenation', icon: Flower2 },
        { name: 'Body Treatments', href: '/services/body-treatments', desc: 'Massages & contouring', icon: Bath },
        { name: 'Laser Tech', href: '/laser-tech', desc: 'Advanced skin tech', icon: Droplets },
        { name: 'Nail Care', href: '/services/nail-care', desc: 'Manicure & pedicure', icon: Heart },
        { name: 'Waxing', href: '/services/waxing', desc: 'Hair removal', icon: Shell },
      ],
    },
    {
      title: 'Packages & more',
      items: [
        { name: 'Packages', href: '/packages', desc: 'Bridal, couples, VIP', icon: Gift },
        { name: 'Gift Cards', href: '/gift-cards', desc: 'For someone special', icon: Gift },
        { name: 'Membership', href: '/membership', desc: 'Unlock rewards', icon: Leaf },
        { name: 'Gallery', href: '/gallery', desc: 'See our work', icon: Images },
        { name: 'FAQ', href: '/#faq', desc: 'Common questions', icon: MessageCircleQuestion },
      ],
    },
  ]

  // Tap-to-fill suggestions for the empty-state. Phrased as concerns
  // (not categories) so they showcase what semantic search is good at.
  const popularSearches = [
    'Bridal glow',
    'Acne breakouts',
    'Stress relief',
    'Hair removal',
    'Melasma',
  ]

  const trimmedQuery = searchQuery.trim()
  const showSemanticPanel = trimmedQuery.length >= 2

  const isActive = (path: string) => pathname === path
  const isPath = (prefix: string) => pathname.startsWith(prefix)

  // Hide bottom nav on auth pages AND admin/staff consoles.
  const authPages = [
    '/signin',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/complete-profile',
    '/verify-email',
    '/offline',
  ]
  const hiddenPages = [...authPages, '/admin', '/staff']
  const isHiddenPage = hiddenPages.some(page => pathname.startsWith(page))
  if (isHiddenPage) return null

  // We deliberately do NOT gate the whole nav on `authChecked` any
  // more. The previous behaviour — `if (!authChecked) return null` —
  // meant the entire bottom nav stayed invisible until the cookie
  // round-trip to `/api/auth/me` finished, which on slow Lagos
  // connections looked like the nav was "loading" for 1–2 seconds
  // every page load. We now render the nav skeleton immediately and
  // only the profile slot waits for `authChecked` to flip — that
  // slot reserves a fixed-size placeholder so the nav layout
  // doesn't shift when the avatar arrives.

  const closeAll = () => {
    setShowServices(false)
    setShowProfile(false)
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : ''

  return (
    <>
      {/* Search bottom sheet
          Previously a full-screen white page, which felt heavy on
          mobile — users said it "took over the phone". It's now a
          drop-up sheet (matches the Services sheet) so the page
          underneath stays partially visible and the keyboard surfaces
          the input without burying the rest of the UI. The hits
          below the input are powered by semantic search
          (`/api/search/semantic`, Upstash Vector, bge-m3 embeddings),
          so a query like "stress + back pain" surfaces the right
          massages and the related blog tip — not just keyword-matched
          titles. Signed-in users get a greeting + "Your shortcuts"
          rail at the top of the empty state. */}
      {showSearch && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div
            className="absolute inset-0 bg-black/40 animate-[derma-backdrop-in_0.2s_ease-out]"
            onClick={() => {
              setShowSearch(false)
              setSearchQuery('')
            }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-[derma-sheet-up_0.28s_ease-out]"
            style={{ maxHeight: '88vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mt-3 shrink-0" />

            {/* Header — input + close. No gradient banner, just a
                clean app-style surface with brand purple accents. */}
            <div className="shrink-0 px-5 pt-3 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  {user ? `Search, ${user.firstName}` : 'Search'}
                </h2>
                <button
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                  }}
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
              <div className="relative mt-3">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  placeholder={user ? `What can we help with today?` : 'Describe your concern…'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-9 text-[15px] bg-gray-100 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#7B2D8E]/30 transition-all placeholder:text-gray-400"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Subtle "AI search" badge — same visual hint the
                  desktop /services page uses, so users know typing
                  here gets them more than a literal title match. */}
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#7B2D8E]/80">
                {semanticLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="w-3 h-3" aria-hidden />
                )}
                <span>{semanticLoading ? 'Searching…' : 'AI search · find by concern, not category'}</span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-5 overscroll-contain">
              {/* Empty state: personalized shortcuts (signed-in only)
                  + trending chips + quick links. Pure text, no
                  thumbnails — keeps the sheet feeling like an app
                  surface, not a catalog. */}
              {!showSemanticPanel && (
                <>
                  {/* Personalized shortcuts — only when signed in.
                      Uses the same destinations as the Profile sheet
                      so users get a consistent mental model for
                      "things tied to me". */}
                  {user && (
                    <div className="mb-5">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                        Your shortcuts
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { icon: CalendarClock, label: 'Bookings', href: '/dashboard?tab=appointments' },
                          { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet' },
                          { icon: Star, label: 'Favorites', href: '/dashboard?tab=favorites' },
                          { icon: LayoutDashboard, label: 'Account', href: '/dashboard' },
                        ].map(({ icon: Icon, label, href }) => (
                          <Link
                            key={label}
                            href={href}
                            onClick={() => {
                              setShowSearch(false)
                              setSearchQuery('')
                            }}
                            className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[#7B2D8E]/[0.06] hover:bg-[#7B2D8E]/[0.12] active:bg-[#7B2D8E]/[0.16] transition-colors"
                          >
                            <span className="w-9 h-9 rounded-xl bg-white text-[#7B2D8E] flex items-center justify-center shadow-sm">
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="text-[11px] font-medium text-gray-800 leading-tight text-center">
                              {label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-5">
                    <div className="flex items-center gap-1.5 mb-3">
                      <TrendingUp className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
                      <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                        {user ? 'Try asking' : 'Try'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setSearchQuery(term)}
                          className="px-3.5 py-1.5 text-[12.5px] font-medium text-[#7B2D8E] bg-[#7B2D8E]/[0.08] rounded-full hover:bg-[#7B2D8E]/[0.14] transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Quick links
                  </p>
                  <div className="divide-y divide-gray-100 bg-gray-50 rounded-2xl overflow-hidden">
                    {searchItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => {
                          setShowSearch(false)
                          setSearchQuery('')
                        }}
                        className="flex items-center justify-between px-4 py-3.5 hover:bg-[#7B2D8E]/[0.05] active:bg-[#7B2D8E]/[0.08] transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[14.5px] font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors truncate">
                            {item.name}
                          </span>
                          {item.tag && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[#7B2D8E]/[0.12] text-[#7B2D8E] rounded flex-shrink-0">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Live AI results */}
            {showSemanticPanel && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Results
                </p>

                {/* Initial spinner — only show when we don't have
                    any results to display yet. Once we have stale
                    results, prefer to keep them on screen and only
                    flicker the badge in the header. */}
                {semanticLoading && (semanticResults?.length ?? 0) === 0 && (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reading the catalog…
                  </div>
                )}

                {!semanticLoading && (semanticResults?.length ?? 0) === 0 && (
                  <div className="text-center py-12 px-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="w-5 h-5 text-gray-400" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      No matches yet
                    </p>
                    <p className="text-xs text-gray-500 max-w-[260px] mx-auto mb-4">
                      Try rephrasing — the AI search works best when you describe
                      what you&apos;re feeling, not just a treatment name.
                    </p>
                    <Link
                      href="/services"
                      onClick={() => {
                        setShowSearch(false)
                        setSearchQuery('')
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:underline"
                    >
                      Browse all services
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {(semanticResults?.length ?? 0) > 0 && (
                  <ul className="space-y-2" role="listbox" aria-label="Matching results">
                    {semanticResults!.map((r) => (
                      <li key={`${r.kind}:${r.url}`} role="option" aria-selected={false}>
                        <Link
                          href={r.url}
                          onClick={() => {
                            setShowSearch(false)
                            setSearchQuery('')
                          }}
                          className="group flex items-start gap-3 px-3 py-3 bg-gray-50 hover:bg-[#7B2D8E]/[0.05] active:bg-[#7B2D8E]/[0.08] rounded-xl transition-colors"
                        >
                          <span
                            aria-hidden
                            className="flex-shrink-0 inline-flex items-center justify-center px-1.5 py-0.5 mt-0.5 rounded bg-[#7B2D8E]/10 text-[#7B2D8E] text-[9.5px] font-bold uppercase tracking-wider"
                          >
                            {KIND_LABEL[r.kind]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors leading-snug">
                              {r.title}
                            </p>
                            {r.summary && (
                              <p className="mt-0.5 text-[12px] text-gray-500 leading-relaxed line-clamp-2">
                                {r.summary}
                              </p>
                            )}
                            {(r.priceFrom || r.duration) && (
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                                {r.priceFrom && (
                                  <span>
                                    From{' '}
                                    <span className="font-semibold text-[#7B2D8E]">
                                      {r.priceFrom}
                                    </span>
                                  </span>
                                )}
                                {r.duration && <span>· {r.duration}</span>}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 mt-1 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Services drop-up sheet */}
      {showServices && (
        <div
          className="fixed inset-0 z-[55] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Services menu"
        >
          <div
            className="absolute inset-0 bg-black/40 animate-[derma-backdrop-in_0.2s_ease-out]"
            onClick={() => setShowServices(false)}
          />
          <div
            className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-[derma-sheet-up_0.28s_ease-out]"
            style={{ maxHeight: '82vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[#7B2D8E]" aria-hidden />
                <h3 className="text-base font-semibold text-gray-900">Services</h3>
              </div>
              <button
                onClick={() => setShowServices(false)}
                className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
                aria-label="Close services menu"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-2" />
            <div className="overflow-y-auto pb-5" style={{ maxHeight: '72vh' }}>
              {servicesGroups.map((group) => (
                <div key={group.title} className="px-5 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    {group.title}
                  </p>
                  <div className="space-y-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isAccent = 'accent' in item && item.accent
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setShowServices(false)}
                          className={`flex items-center gap-3 p-3 rounded-2xl transition-all group ${
                            isAccent
                              ? 'bg-[#7B2D8E]/5 hover:bg-[#7B2D8E]/10 ring-1 ring-[#7B2D8E]/15'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isAccent
                                ? 'bg-[#7B2D8E] text-white'
                                : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-gray-900 leading-tight">
                              {item.name}
                            </span>
                            <span className="block text-[11px] text-gray-500 leading-snug mt-0.5">
                              {item.desc}
                            </span>
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile drop-up sheet */}
      {showProfile && user && (
        <div
          className="fixed inset-0 z-[55] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Profile menu"
        >
          <div
            className="absolute inset-0 bg-black/40 animate-[derma-backdrop-in_0.2s_ease-out]"
            onClick={() => setShowProfile(false)}
          />
          <div
            className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-[derma-sheet-up_0.28s_ease-out]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mt-3" />
            <div className="px-5 pt-4 pb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        'conic-gradient(from 180deg at 50% 50%, #7B2D8E, #B084D6, #7B2D8E)',
                    }}
                    aria-hidden
                  />
                  <div className="relative m-[3px] w-12 h-12 rounded-full bg-white p-[2px]">
                    <div className="w-full h-full rounded-full bg-[#7B2D8E] overflow-hidden flex items-center justify-center text-white font-semibold text-sm">
                      {user.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={user.avatarUrl} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1">
                {[
                  { icon: User, label: 'Dashboard', href: '/dashboard' },
                  { icon: Clock, label: 'My Bookings', href: '/dashboard?tab=appointments' },
                  { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet' },
                  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
                ].map(({ icon: Icon, label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setShowProfile(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#7B2D8E]/5 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />
                  </Link>
                ))}
              </div>

              <button
                type="button"
                onClick={async () => {
                  setShowProfile(false)
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' })
                  } catch { /* ignore */ }
                  window.location.href = '/'
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation
          Visually softened: a subtle vertical gradient (lighter at
          the top, deeper at the bottom) replaces the flat purple
          block, plus a thin top hairline and a 1px inner highlight
          on the rounded edge so the bar reads as a polished surface
          instead of a rigid slab. */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div
          className="relative rounded-t-3xl shadow-[0_-12px_30px_-12px_rgba(123,45,142,0.45)] px-4 pt-3"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            backgroundImage:
              'linear-gradient(180deg, #8C3CA1 0%, #7B2D8E 55%, #6E2580 100%)',
          }}
        >
          {/* Inner top highlight — a 1px bright line that catches the
              rounded corners and makes the bar feel lit from above. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full bg-white/20"
          />
          <div className="flex items-end justify-around">
            {/* Home */}
            <Link
              href="/"
              aria-label="Home"
              onClick={closeAll}
              className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all ${
                isActive('/') ? 'bg-white/15' : ''
              }`}
            >
              <svg className={`w-5 h-5 ${isActive('/') ? 'text-white' : 'text-white/70'}`} fill={isActive('/') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/') ? 0 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`text-[10px] font-medium ${isActive('/') ? 'text-white' : 'text-white/70'}`}>Home</span>
            </Link>

            {/* Services — signed-in users get the rich drop-up sheet
                with survey / consultation / packages shortcuts. Signed-out
                visitors just navigate straight to /services so they hit
                the public marketing page instead of a menu that surfaces
                auth-gated CTAs they can't complete yet. */}
            {user ? (
              <button
                type="button"
                onClick={() => { setShowProfile(false); setShowServices(true) }}
                aria-label="Open services menu"
                aria-expanded={showServices}
                className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all ${
                  showServices || isPath('/services') || isPath('/packages') || isPath('/laser-tech') || isPath('/survey') || isPath('/consultation') || isPath('/free-consultation')
                    ? 'bg-white/15'
                    : ''
                }`}
              >
                <Flower2 className={`w-5 h-5 ${showServices ? 'text-white' : 'text-white/70'}`} strokeWidth={showServices ? 2.25 : 1.5} />
                <span className={`text-[10px] font-medium ${showServices ? 'text-white' : 'text-white/70'}`}>Services</span>
              </button>
            ) : (
              <Link
                href="/services"
                onClick={closeAll}
                aria-label="Services"
                className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all ${
                  isPath('/services') || isPath('/packages') || isPath('/laser-tech')
                    ? 'bg-white/15'
                    : ''
                }`}
              >
                <Flower2 className={`w-5 h-5 ${isPath('/services') ? 'text-white' : 'text-white/70'}`} strokeWidth={isPath('/services') ? 2.25 : 1.5} />
                <span className={`text-[10px] font-medium ${isPath('/services') ? 'text-white' : 'text-white/70'}`}>Services</span>
              </Link>
            )}

            {/* Search (centre elevated) */}
            <button
              type="button"
              onClick={() => { closeAll(); setShowSearch(true) }}
              aria-label="Search"
              className="flex flex-col items-center gap-1 -mt-5"
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#7B2D8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-medium text-white/70">Search</span>
            </button>

            {/* Book */}
            <Link
              href="/booking"
              aria-label="Book appointment"
              onClick={closeAll}
              className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all ${
                isActive('/booking') ? 'bg-white/15' : ''
              }`}
            >
              <svg className={`w-5 h-5 ${isActive('/booking') ? 'text-white' : 'text-white/70'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive('/booking') ? 0 : 1.5}>
                {isActive('/booking') ? (
                  <>
                    <rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" />
                    <path d="M8 2v4M16 2v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <path d="M9 13l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                ) : (
                  <>
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M8 2v4M16 2v4M3 10h18" />
                    <path d="M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
              </svg>
              <span className={`text-[10px] font-medium ${isActive('/booking') ? 'text-white' : 'text-white/70'}`}>Book</span>
            </Link>

            {/* Profile slot — three states:
                • auth still loading → fixed-size invisible placeholder
                  so the row doesn't reflow when the avatar arrives.
                • signed in → avatar with brand-purple ring.
                • signed out → Sign in glyph.
                The placeholder branch is what lets us render the
                rest of the nav immediately on first paint without
                waiting for `/api/auth/me` to resolve. */}
            {!authChecked ? (
              <span
                aria-hidden="true"
                className="flex flex-col items-center gap-1 py-1 px-2 opacity-0 pointer-events-none"
              >
                <span className="w-7 h-7 rounded-full" />
                <span className="text-[10px] font-medium">&nbsp;</span>
              </span>
            ) : authChecked && user ? (
              <button
                type="button"
                onClick={() => { setShowServices(false); setShowProfile(true) }}
                aria-label="Open profile menu"
                aria-expanded={showProfile}
                className="flex flex-col items-center gap-1 py-1 px-2"
              >
                <span
                  className="relative w-7 h-7 rounded-full p-[2px] flex items-center justify-center"
                  style={{
                    background:
                      'conic-gradient(from 180deg at 50% 50%, #FFFFFF 0deg, #F3D6FF 90deg, #FFFFFF 180deg, #D9A7F2 270deg, #FFFFFF 360deg)',
                  }}
                >
                  <span className="w-full h-full rounded-full bg-[#7B2D8E] overflow-hidden flex items-center justify-center text-[10px] font-bold text-white">
                    {user.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={user.avatarUrl} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </span>
                </span>
                <span className="text-[10px] font-medium text-white/70">Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { closeAll(); router.push('/signin') }}
                aria-label="Sign in"
                className="flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all"
              >
                <div className="w-7 h-7 rounded-full border-2 border-white/60 flex items-center justify-center">
                  <User className="w-4 h-4 text-white/80" />
                </div>
                <span className="text-[10px] font-medium text-white/70">Sign in</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
