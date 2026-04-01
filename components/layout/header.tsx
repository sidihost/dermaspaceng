'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  X, 
  ChevronRight, 
  ChevronDown, 
  User, 
  Sparkles, 
  Droplets, 
  Leaf, 
  Images, 
  Feather, 
  HandHeart, 
  CalendarCheck, 
  Users, 
  MessageCircleQuestion, 
  FileText, 
  Bath, 
  Flower2, 
  Heart, 
  Gift, 
  Shell 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserData {
  firstName: string
  lastName: string
  email: string
}

// Cache user data in memory to prevent flash
let cachedUser: UserData | null = null
let authCheckDone = false

const navLinks = [
  { 
    name: 'Services', 
    href: '/services',
    icon: Sparkles,
    hasDropdown: true,
    dropdownItems: [
      { name: 'All Services', href: '/services', icon: Sparkles },
      { name: 'Facials', href: '/services#facials', icon: Flower2 },
      { name: 'Body Treatments', href: '/services#body', icon: Bath },
      { name: 'Skin Analysis', href: '/services#analysis', icon: Droplets },
    ]
  },
  { 
    name: 'Packages', 
    href: '/packages',
    icon: Gift,
    hasDropdown: true,
    dropdownItems: [
      { name: 'All Packages', href: '/packages', icon: Gift },
      { name: 'Bridal Packages', href: '/packages#bridal', icon: Flower2 },
      { name: 'Couples Spa', href: '/packages#couples', icon: Heart },
      { name: 'VIP Experience', href: '/packages#vip', icon: Shell },
    ]
  },
  { name: 'Membership', href: '/membership', icon: Leaf },
  { name: 'Gallery', href: '/gallery', icon: Images },
  { 
    name: 'About', 
    href: '/about',
    icon: Feather,
    hasDropdown: true,
    dropdownItems: [
      { name: 'Our Story', href: '/about', icon: Feather },
      { name: 'Our Team', href: '/about#team', icon: Users },
      { name: 'FAQ', href: '/#faq', icon: MessageCircleQuestion },
      { name: 'Survey', href: '/survey', icon: FileText },
    ]
  },
  { name: 'Contact', href: '/contact', icon: HandHeart },
  { name: 'Book Consultation', href: '/consultation', icon: CalendarCheck },
]

export default function Header() {
const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(cachedUser)
  const [isAuthLoading, setIsAuthLoading] = useState(!authCheckDone)
  const [showBanner, setShowBanner] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Check if user is logged in - with caching for instant display
  useEffect(() => {
    const checkAuth = async () => {
      // If we already have cached data and auth check is done, skip
      if (authCheckDone && cachedUser) {
        setUser(cachedUser)
        setIsAuthLoading(false)
        return
      }
      
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            cachedUser = data.user
            setUser(data.user)
          } else {
            cachedUser = null
            setUser(null)
          }
        } else {
          cachedUser = null
          setUser(null)
        }
      } catch { 
        cachedUser = null
        setUser(null)
      } finally {
        authCheckDone = true
        setIsAuthLoading(false)
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* Notification Banner */}
      {showBanner && (
        <div className="bg-[#7B2D8E] text-white py-2.5 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <p className="text-xs sm:text-sm text-center">
              Welcome to our new website! Experience seamless booking.
            </p>
            <button 
              onClick={() => setShowBanner(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <header className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md' 
          : 'bg-white'
      )}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
                alt="Dermaspace"
                width={140}
                height={42}
                className="h-9 w-auto"
                priority
              />
            </Link>

            {/* Desktop Nav with Dropdowns */}
            <nav className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
              {navLinks.slice(0, 7).map((link) => (
                <div key={link.name} className="relative">
                  {link.hasDropdown ? (
                    <>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-lg",
                          activeDropdown === link.name 
                            ? "text-[#7B2D8E] bg-[#7B2D8E]/5" 
                            : "text-gray-600 hover:text-[#7B2D8E]"
                        )}
                      >
                        {link.name}
                        <ChevronDown className={cn(
                          "w-3.5 h-3.5 transition-transform",
                          activeDropdown === link.name && "rotate-180"
                        )} />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {activeDropdown === link.name && (
                        <div className="absolute top-full left-0 mt-1 w-48 rounded-xl border border-gray-100 bg-white overflow-hidden">
                          {link.dropdownItems?.map((item, idx) => {
                            const ItemIcon = item.icon
                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setActiveDropdown(null)}
                                className={cn(
                                  "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-gray-600 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E]",
                                  idx === 0 && "font-medium"
                                )}
                              >
                                {ItemIcon && <ItemIcon className="w-4 h-4" />}
                                {item.name}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors"
                    >
                      {link.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Premium Spa Shop Icon - Animated */}
              <div className="relative shop-icon-container">
                <button
                  onMouseEnter={() => setShowCartTooltip(true)}
                  onMouseLeave={() => setShowCartTooltip(false)}
                  className="shop-icon-btn relative w-11 h-11 flex items-center justify-center rounded-2xl border-2 border-[#7B2D8E]/20 bg-white hover:border-[#7B2D8E] hover:shadow-lg hover:shadow-[#7B2D8E]/10 transition-all duration-300 group overflow-hidden"
                  aria-label="Shop - Coming soon"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 shop-shimmer" />
                  
                  {/* Premium Dermaspace Shop Icon */}
                  <svg 
                    viewBox="0 0 32 32" 
                    fill="none" 
                    className="relative w-6 h-6 transition-all duration-500 group-hover:scale-110 shop-icon-svg"
                  >
                    {/* Left petal */}
                    <path 
                      d="M8 12C6 10 5 7 6 5c1-2 4-2 6 0 1.5 1.5 2 4 2 6-2 0-4.5-.5-6 1z" 
                      className="fill-[#7B2D8E]/20 stroke-[#7B2D8E] transition-all duration-300 group-hover:fill-[#7B2D8E]/30"
                      strokeWidth="1.2"
                    />
                    {/* Right petal */}
                    <path 
                      d="M24 12c2-2 3-5 2-7-1-2-4-2-6 0-1.5 1.5-2 4-2 6 2 0 4.5-.5 6 1z" 
                      className="fill-[#7B2D8E]/20 stroke-[#7B2D8E] transition-all duration-300 group-hover:fill-[#7B2D8E]/30"
                      strokeWidth="1.2"
                    />
                    {/* Center droplet */}
                    <path 
                      d="M16 10c-3 4-5 8-5 12 0 4 2.5 6 5 6s5-2 5-6c0-4-2-8-5-12z" 
                      className="fill-[#7B2D8E]/10 stroke-[#7B2D8E] transition-all duration-300 group-hover:fill-[#7B2D8E]/20"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    {/* Shine */}
                    <path 
                      d="M14 20c0 1.5 1 2.5 2 2.5" 
                      className="stroke-[#7B2D8E]/50"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Coming soon ring */}
                  <span className="absolute inset-0 rounded-2xl shop-ring" />
                </button>
              </div>

              {/* Profile or Auth buttons */}
              {isAuthLoading ? (
                <div className="hidden lg:flex items-center gap-2 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="w-16 h-4 rounded bg-gray-200 animate-pulse" />
                </div>
              ) : user ? (
                <Link
                  href="/dashboard"
                  className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-semibold">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user.firstName}</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/signin"
                    className="hidden lg:inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#7B2D8E] transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="hidden lg:inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#5A1D6A] transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-[#7B2D8E]/5"
                aria-label="Open menu"
              >
                <div className="flex flex-col gap-1">
                  <span className="w-4 h-0.5 rounded-full bg-[#7B2D8E]" />
                  <span className="w-3 h-0.5 rounded-full bg-[#7B2D8E]" />
                  <span className="w-4 h-0.5 rounded-full bg-[#7B2D8E]" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        'fixed inset-0 z-[100] transition-all duration-300',
        isMobileMenuOpen ? 'visible' : 'invisible'
      )}>
        <div 
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity duration-300',
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        <div className={cn(
          'absolute top-0 right-0 w-full max-w-sm h-full bg-white transition-transform duration-300 ease-out',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}>
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
              alt="Dermaspace"
              width={100}
              height={30}
              className="h-7 w-auto"
            />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          <nav className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {navLinks.map((link, idx) => {
              const LinkIcon = link.icon
              return (
              <div key={link.name}>
                {link.hasDropdown ? (
                  <>
                    <button
                      onClick={() => setMobileExpandedMenu(mobileExpandedMenu === link.name ? null : link.name)}
                      className="flex items-center justify-between w-full py-3.5 border-b border-gray-100"
                      style={{
                        animation: isMobileMenuOpen ? `slideInRight 0.3s ease-out ${idx * 50}ms forwards` : 'none',
                        opacity: isMobileMenuOpen ? 1 : 0,
                      }}
                    >
                      <span className="flex items-center gap-3 text-base font-medium text-gray-900">
                        {LinkIcon && <LinkIcon className="w-5 h-5 text-[#7B2D8E]" />}
                        {link.name}
                      </span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform text-gray-500",
                        mobileExpandedMenu === link.name && "rotate-180"
                      )} />
                    </button>
                    
                    {mobileExpandedMenu === link.name && (
                      <div className="pl-4 py-2 bg-gray-50">
                        {link.dropdownItems?.map((item) => {
                          const ItemIcon = item.icon
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center justify-between py-2.5 text-gray-600"
                            >
                              <span className="flex items-center gap-2.5 text-sm">
                                {ItemIcon && <ItemIcon className="w-4 h-4 text-[#7B2D8E]" />}
                                {item.name}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3.5 border-b border-gray-100 group"
                    style={{
                      animation: isMobileMenuOpen ? `slideInRight 0.3s ease-out ${idx * 50}ms forwards` : 'none',
                      opacity: isMobileMenuOpen ? 1 : 0,
                    }}
                  >
                    <span className="flex items-center gap-3 text-base font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                      {LinkIcon && <LinkIcon className="w-5 h-5 text-[#7B2D8E]" />}
                      {link.name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
                  </Link>
                )}
              </div>
            )})}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50">
            {isAuthLoading ? (
              <div className="flex items-center justify-center w-full py-3">
                <div className="w-6 h-6 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : user ? (
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-3 text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#5A1D6A] transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/signin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 flex items-center justify-center py-3 text-sm font-semibold text-[#7B2D8E] border border-[#7B2D8E] rounded-xl hover:bg-[#7B2D8E]/5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 flex items-center justify-center py-3 text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#5A1D6A] transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
            <p className="mt-4 text-center text-xs text-gray-500">+234 901 797 2919</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Shop icon elegant animations */
        .shop-icon-container {
          position: relative;
        }
        
        .shop-shimmer {
          background: linear-gradient(
            110deg,
            transparent 25%,
            rgba(123, 45, 142, 0.08) 50%,
            transparent 75%
          );
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .shop-ring {
          border: 2px solid transparent;
          background: linear-gradient(white, white) padding-box,
                      linear-gradient(135deg, transparent 40%, rgba(123, 45, 142, 0.3) 50%, transparent 60%) border-box;
          background-size: 100% 100%, 300% 300%;
          animation: ring-sweep 4s linear infinite;
        }
        
        @keyframes ring-sweep {
          0% { background-position: 0 0, 0% 0%; }
          100% { background-position: 0 0, 300% 300%; }
        }
        
        .shop-icon-svg {
          animation: icon-float 3s ease-in-out infinite;
        }
        
        @keyframes icon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        
        .shop-icon-btn:hover .shop-shimmer {
          animation-duration: 1.5s;
        }
        
        .shop-icon-btn:hover .shop-ring {
          animation-duration: 2s;
        }
        
        .shop-icon-btn:hover .shop-icon-svg {
          animation: none;
          transform: scale(1.1);
        }
        
        .animate-in {
          animation: animateIn 0.2s ease-out;
        }
        
        @keyframes animateIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .delay-75 { animation-delay: 75ms; }
        .delay-150 { animation-delay: 150ms; }
      `}</style>
    </>
  )
}
