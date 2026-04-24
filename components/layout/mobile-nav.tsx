'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { X, ArrowRight, Search, TrendingUp } from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Profile / Account links were intentionally removed from the
  // bottom bar — the top header already exposes the avatar, sign-in
  // button, and dashboard entry, and rendering the same surface
  // twice on a mobile viewport was both noisy and cost us two
  // slots that could go to conversion-critical destinations
  // (Consult, Survey) instead. See conversation with product owner.

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
    { name: 'Gift Cards', href: '/packages', tag: null, image: null },
    { name: 'Electrolysis', href: '/laser-tech', tag: 'Permanent', image: null },
  ]

  const popularSearches = ['Laser', 'Facial', 'Massage', 'Packages']

  const filteredItems = searchQuery
    ? searchItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchItems.slice(0, 8)

  const isActive = (path: string) => pathname === path

  // Hide bottom nav on auth pages AND on admin/staff routes — the admin and
  // staff consoles have their own full-height sidebars, and the floating
  // bottom bar was covering the last entries in their nav drawers on mobile.
  // /complete-profile is part of the signup funnel (users land there from
  // email verification and must finish before they're really "in"), so we
  // treat it as an auth page and hide the bar until registration is done.
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

  if (isHiddenPage) {
    return null
  }

  return (
    <>
      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[60] bg-white animate-in fade-in duration-200">
          {/* Header */}
          <div className="bg-[#7B2D8E] px-5 pt-6 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Search</h2>
              <button
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery('')
                }}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Search Input */}
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5" style={{ height: 'calc(100vh - 160px)' }}>
            {/* Popular Searches */}
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

            {/* Results */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {searchQuery ? `Results` : 'Quick Links'}
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div
          className="bg-[#7B2D8E] rounded-t-3xl shadow-2xl px-4 pt-3"
          style={{
            // Use the system safe-area inset so the labels never get
            // eaten by Android's gesture bar or iOS's home indicator.
            // Fallback to a comfortable ~1rem when no inset is set.
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
          {/* 5-tab rail, search centred and elevated. The previous
              layout carried an Account / Packages slot next to Home;
              that's now Consult + Survey so conversion-critical
              destinations are one tap away on mobile. The top header
              still handles profile/sign-in. */}
          <div className="flex items-end justify-around">
            {/* Home */}
            <Link
              href="/"
              aria-label="Home"
              className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all ${
                isActive('/') ? 'bg-white/15' : ''
              }`}
            >
              <svg className={`w-5 h-5 ${isActive('/') ? 'text-white' : 'text-white/70'}`} fill={isActive('/') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/') ? 0 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`text-[10px] font-medium ${isActive('/') ? 'text-white' : 'text-white/70'}`}>Home</span>
            </Link>

            {/* Consult — free AI-guided consultation flow. Landing
                page lives at /consultation (the existing one) with
                /free-consultation as an alt entry; we point at
                /consultation since it renders the rich questionnaire. */}
            <Link
              href="/consultation"
              aria-label="Free consultation"
              className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all ${
                pathname.startsWith('/consultation') || pathname.startsWith('/free-consultation') ? 'bg-white/15' : ''
              }`}
            >
              <svg className={`w-5 h-5 ${pathname.startsWith('/consultation') || pathname.startsWith('/free-consultation') ? 'text-white' : 'text-white/70'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname.startsWith('/consultation') ? 0 : 1.5}>
                {pathname.startsWith('/consultation') || pathname.startsWith('/free-consultation') ? (
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill="currentColor" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                )}
              </svg>
              <span className={`text-[10px] font-medium ${pathname.startsWith('/consultation') || pathname.startsWith('/free-consultation') ? 'text-white' : 'text-white/70'}`}>Consult</span>
            </Link>

            {/* Search - Center Elevated */}
            <button
              type="button"
              onClick={() => setShowSearch(true)}
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

            {/* Survey — short skin-type quiz that feeds into the
                dashboard. Lives at /survey. */}
            <Link
              href="/survey"
              aria-label="Skin survey"
              className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all ${
                pathname.startsWith('/survey') ? 'bg-white/15' : ''
              }`}
            >
              <svg className={`w-5 h-5 ${pathname.startsWith('/survey') ? 'text-white' : 'text-white/70'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname.startsWith('/survey') ? 0 : 1.5}>
                {pathname.startsWith('/survey') ? (
                  <>
                    <rect x="4" y="3" width="16" height="18" rx="2" fill="currentColor" />
                    <path d="M8 8h8M8 12h8M8 16h5" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
                  </>
                )}
              </svg>
              <span className={`text-[10px] font-medium ${pathname.startsWith('/survey') ? 'text-white' : 'text-white/70'}`}>Survey</span>
            </Link>

            {/* Book */}
            <Link
              href="/booking"
              aria-label="Book appointment"
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
          </div>
        </div>
      </nav>
    </>
  )
}
