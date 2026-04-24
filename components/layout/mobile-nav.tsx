'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  LogOut,
} from 'lucide-react'

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
  const pathname = usePathname()
  const router = useRouter()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
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

  const searchItems = [
    { name: 'Laser Tech', href: '/laser-tech', tag: 'Advanced', image: '/images/laser-hero.jpg' },
    { name: 'Laser Hair Removal', href: '/laser-tech', tag: 'Popular', image: '/images/laser-treatment.jpg' },
    { name: 'Carbon Peel', href: '/laser-tech', tag: 'Hollywood Peel', image: '/images/carbon-peel.jpg' },
    { name: 'Laser Rejuvenation', href: '/laser-tech', tag: 'Brightening', image: '/images/laser-treatment.jpg' },
    { name: 'Facial Treatments', href: '/services/facial-treatments', tag: 'Popular', image: null },
    { name: 'Body Treatments', href: '/services/body-treatments', tag: 'Relaxing', image: null },
    { name: 'Nail Care', href: '/services/nail-care', tag: null, image: null },
    { name: 'Waxing', href: '/services/waxing', tag: null, image: null },
    { name: 'Packages', href: '/packages', tag: 'Best Value', image: null },
    { name: 'Book Appointment', href: '/booking', tag: null, image: null },
    { name: 'Membership', href: '/membership', tag: 'VIP', image: null },
    { name: 'Contact Us', href: '/contact', tag: null, image: null },
    { name: 'About Us', href: '/about', tag: null, image: null },
    { name: 'Microneedling', href: '/services/facial-treatments', tag: 'Advanced', image: null },
    { name: 'Acne Treatment', href: '/services/facial-treatments', tag: null, image: null },
    { name: 'Deep Tissue Massage', href: '/services/body-treatments', tag: null, image: null },
    { name: 'Hot Stone Massage', href: '/services/body-treatments', tag: 'Luxury', image: null },
    { name: 'Gift Cards', href: '/gift-cards', tag: null, image: null },
    { name: 'Electrolysis', href: '/laser-tech', tag: 'Permanent', image: null },
    { name: 'Survey', href: '/survey', tag: 'Feedback', image: null },
    { name: 'Free Consultation', href: '/consultation', tag: null, image: null },
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

  const popularSearches = ['Laser', 'Facial', 'Massage', 'Packages', 'Consultation']

  const filteredItems = searchQuery
    ? searchItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : searchItems.slice(0, 8)

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

  // Only render the bottom nav (and its Services/Profile drop-ups)
  // for logged-in users. Logged-out visitors already have the full
  // marketing nav in the header's mobile menu — showing a second
  // nav on top of it was confusing and duplicated entry points
  // like Services. Wait for the auth check before returning null so
  // we don't flash-on-then-hide for signed-in users.
  if (!authChecked) return null
  if (!user) return null

  const closeAll = () => {
    setShowServices(false)
    setShowProfile(false)
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : ''

  return (
    <>
      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[60] bg-white animate-in fade-in duration-200">
          <div className="bg-[#7B2D8E] px-5 pt-6 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Search</h2>
              <button
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery('')
                }}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                aria-label="Close search"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="What are you looking for?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 text-sm bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5" style={{ height: 'calc(100vh - 160px)' }}>
            {!searchQuery && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  <p className="text-xs font-semibold text-gray-700">Popular</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => setSearchQuery(term)}
                      className="px-3 py-1.5 text-xs font-medium text-[#7B2D8E] bg-[#7B2D8E]/5 rounded-full hover:bg-[#7B2D8E]/10 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {searchQuery ? 'Results' : 'Quick Links'}
              </p>
              <div className="space-y-1.5">
                {filteredItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      setShowSearch(false)
                      setSearchQuery('')
                    }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-[#7B2D8E]/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                          <Search className="w-4 h-4 text-[#7B2D8E]" />
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                          {item.name}
                        </span>
                        {item.tag && (
                          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[#7B2D8E] text-white rounded">
                            {item.tag}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E] transition-all" />
                  </Link>
                ))}
                {searchQuery && filteredItems.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 mb-2">No results found</p>
                    <Link
                      href="/services"
                      onClick={() => setShowSearch(false)}
                      className="inline-flex items-center gap-1 text-sm text-[#7B2D8E] font-medium"
                    >
                      Browse all services
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div
          className="bg-[#7B2D8E] rounded-t-3xl shadow-2xl px-4 pt-3"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
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

            {/* Services (drop-up) */}
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

            {/* Profile — avatar with purple ring for signed in users,
                simple sign-in glyph otherwise. */}
            {authChecked && user ? (
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
