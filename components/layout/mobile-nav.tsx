'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Crown, Search, CheckSquare, X, ArrowRight } from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [countryCode, setCountryCode] = useState('NG')

  // Detect country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        if (data.country_code) {
          setCountryCode(data.country_code)
        }
      } catch (error) {
        // Default to Nigeria
        setCountryCode('NG')
      }
    }
    detectCountry()
  }, [])

  const searchItems = [
    { name: 'Facial Treatments', href: '/services/facial-treatments' },
    { name: 'Body Treatments', href: '/services/body-treatments' },
    { name: 'Nail Care', href: '/services/nail-care' },
    { name: 'Waxing', href: '/services/waxing' },
    { name: 'Packages', href: '/packages' },
    { name: 'Book Appointment', href: '/booking' },
    { name: 'Membership', href: '/membership' },
    { name: 'Contact Us', href: '/contact' },
    { name: 'About Us', href: '/about' },
    { name: 'Microneedling', href: '/services/facial-treatments' },
    { name: 'Acne Treatment', href: '/services/facial-treatments' },
    { name: 'Deep Tissue Massage', href: '/services/body-treatments' },
    { name: 'Hot Stone Massage', href: '/services/body-treatments' },
    { name: 'Gift Cards', href: '/packages' },
  ]

  const filteredItems = searchQuery
    ? searchItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchItems.slice(0, 6)

  return (
    <>
      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[60] bg-white">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery('')
                }}
                className="p-2 -ml-2"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search services, packages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-4 pr-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:border-[#7B2D8E]"
                  autoFocus
                />
              </div>
            </div>

            {/* Country indicator */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <span className="text-xs text-gray-500">Location:</span>
              <span className="text-xs font-medium text-[#7B2D8E]">
                {countryCode === 'NG' ? 'Nigeria' : countryCode}
              </span>
            </div>

            {/* Search Results */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500 px-1 mb-3">
                {searchQuery ? 'Results' : 'Popular searches'}
              </p>
              {filteredItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                  }}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base text-gray-900">{item.name}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
              ))}
              {searchQuery && filteredItems.length === 0 && (
                <p className="text-sm text-gray-500 p-4">No results found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 md:hidden">
        <div className="flex items-center justify-around py-2 pb-safe">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 px-6 py-2 ${
              pathname === '/' ? 'text-[#7B2D8E]' : 'text-gray-500'
            }`}
          >
            <Crown className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-medium">Home</span>
          </Link>

          <button
            onClick={() => setShowSearch(true)}
            className="flex flex-col items-center gap-1 px-6 py-2 text-gray-500"
          >
            <Search className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-medium">Search</span>
          </button>

          <Link
            href="/booking"
            className={`flex flex-col items-center gap-1 px-6 py-2 ${
              pathname === '/booking' ? 'text-[#7B2D8E]' : 'text-gray-500'
            }`}
          >
            <CheckSquare className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-medium">Book</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
