'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, ArrowRight, MapPin } from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [countryCode, setCountryCode] = useState('NG')
  const [countryName, setCountryName] = useState('Nigeria')

  // Detect country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        if (data.country_code) {
          setCountryCode(data.country_code)
          setCountryName(data.country_name || data.country_code)
        }
      } catch {
        setCountryCode('NG')
        setCountryName('Nigeria')
      }
    }
    detectCountry()
  }, [])

  const searchItems = [
    { name: 'Facial Treatments', href: '/services/facial-treatments', tag: 'Popular' },
    { name: 'Body Treatments', href: '/services/body-treatments', tag: 'Relaxing' },
    { name: 'Nail Care', href: '/services/nail-care', tag: null },
    { name: 'Waxing', href: '/services/waxing', tag: null },
    { name: 'Packages', href: '/packages', tag: 'Best Value' },
    { name: 'Book Appointment', href: '/booking', tag: null },
    { name: 'Membership', href: '/membership', tag: 'VIP' },
    { name: 'Contact Us', href: '/contact', tag: null },
    { name: 'About Us', href: '/about', tag: null },
    { name: 'Microneedling', href: '/services/facial-treatments', tag: 'Advanced' },
    { name: 'Acne Treatment', href: '/services/facial-treatments', tag: null },
    { name: 'Deep Tissue Massage', href: '/services/body-treatments', tag: null },
    { name: 'Hot Stone Massage', href: '/services/body-treatments', tag: 'Luxury' },
    { name: 'Gift Cards', href: '/packages', tag: null },
  ]

  const filteredItems = searchQuery
    ? searchItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchItems.slice(0, 6)

  const isActive = (path: string) => pathname === path

  return (
    <>
      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[60] bg-gradient-to-b from-white to-[#FDFBF9]">
          <div className="p-5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Search</h2>
              <button
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery('')
                }}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="What are you looking for?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 text-base bg-white border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-[#7B2D8E] transition-colors"
                autoFocus
              />
            </div>

            {/* Country Indicator */}
            <div className="flex items-center gap-2 mb-6 px-1">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#7B2D8E]/10 rounded-full">
                <MapPin className="w-3.5 h-3.5 text-[#7B2D8E]" />
                <span className="text-xs font-medium text-[#7B2D8E]">{countryName}</span>
              </div>
              {countryCode === 'NG' && (
                <span className="text-xs text-gray-500">Serving Lagos</span>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-1 mb-4">
                {searchQuery ? `Results for "${searchQuery}"` : 'Quick Links'}
              </p>
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      setShowSearch(false)
                      setSearchQuery('')
                    }}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                        {item.name}
                      </span>
                      {item.tag && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-[#D4A853]/20 text-[#D4A853] rounded-full">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
                {searchQuery && filteredItems.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-gray-500 mb-2">No results found</p>
                    <Link 
                      href="/services"
                      onClick={() => setShowSearch(false)}
                      className="text-[#7B2D8E] font-medium text-sm"
                    >
                      Browse all services
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Full Width */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-[#7B2D8E] rounded-t-3xl shadow-2xl px-2 py-4 pb-6">
          <div className="flex items-end justify-around">
            {/* Home */}
            <Link
              href="/"
              className={`flex flex-col items-center gap-1 min-w-[60px] py-2 px-3 rounded-2xl transition-all ${
                isActive('/') 
                  ? 'bg-white' 
                  : ''
              }`}
            >
              <svg className={`w-6 h-6 ${isActive('/') ? 'text-[#7B2D8E]' : 'text-white/80'}`} fill={isActive('/') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/') ? 0 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`text-xs font-semibold ${isActive('/') ? 'text-[#7B2D8E]' : 'text-white/80'}`}>Home</span>
            </Link>

            {/* Services */}
            <Link
              href="/services"
              className={`flex flex-col items-center gap-1 min-w-[60px] py-2 px-3 rounded-2xl transition-all ${
                pathname.startsWith('/services') 
                  ? 'bg-white' 
                  : ''
              }`}
            >
              {/* 4-dot grid icon */}
              <svg className={`w-6 h-6 ${pathname.startsWith('/services') ? 'text-[#7B2D8E]' : 'text-white/80'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="7" cy="7" r="2.5" strokeWidth={pathname.startsWith('/services') ? 0 : 1.5} fill={pathname.startsWith('/services') ? 'currentColor' : 'none'} />
                <circle cx="17" cy="7" r="2.5" strokeWidth={pathname.startsWith('/services') ? 0 : 1.5} fill={pathname.startsWith('/services') ? 'currentColor' : 'none'} />
                <circle cx="7" cy="17" r="2.5" strokeWidth={pathname.startsWith('/services') ? 0 : 1.5} fill={pathname.startsWith('/services') ? 'currentColor' : 'none'} />
                <circle cx="17" cy="17" r="2.5" strokeWidth={pathname.startsWith('/services') ? 0 : 1.5} fill={pathname.startsWith('/services') ? 'currentColor' : 'none'} />
              </svg>
              <span className={`text-xs font-semibold ${pathname.startsWith('/services') ? 'text-[#7B2D8E]' : 'text-white/80'}`}>Services</span>
            </Link>

            {/* Search - Center Elevated */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex flex-col items-center gap-1 -mt-6"
            >
              <div className="w-14 h-14 rounded-full bg-[#D4A853] shadow-lg shadow-[#D4A853]/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-white/80">Search</span>
            </button>

            {/* Packages */}
            <Link
              href="/packages"
              className={`flex flex-col items-center gap-1 min-w-[60px] py-2 px-3 rounded-2xl transition-all ${
                isActive('/packages') 
                  ? 'bg-white' 
                  : ''
              }`}
            >
              {/* Gift box icon */}
              <svg className={`w-6 h-6 ${isActive('/packages') ? 'text-[#7B2D8E]' : 'text-white/80'}`} viewBox="0 0 24 24" fill={isActive('/packages') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isActive('/packages') ? 0 : 1.5}>
                <path d="M20 12v10H4V12" />
                <path d="M2 7h20v5H2V7z" />
                <path d="M12 22V7" />
                <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
              </svg>
              <span className={`text-xs font-semibold ${isActive('/packages') ? 'text-[#7B2D8E]' : 'text-white/80'}`}>Packages</span>
            </Link>

            {/* Book */}
            <Link
              href="/booking"
              className={`flex flex-col items-center gap-1 min-w-[60px] py-2 px-3 rounded-2xl transition-all ${
                isActive('/booking') 
                  ? 'bg-white' 
                  : ''
              }`}
            >
              {/* Calendar with checkmark icon */}
              <svg className={`w-6 h-6 ${isActive('/booking') ? 'text-[#7B2D8E]' : 'text-white/80'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive('/booking') ? 0 : 1.5}>
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
              <span className={`text-xs font-semibold ${isActive('/booking') ? 'text-[#7B2D8E]' : 'text-white/80'}`}>Book</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}
