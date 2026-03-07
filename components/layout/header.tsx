'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { 
    name: 'Services', 
    href: '/services',
    hasDropdown: true,
    dropdownItems: [
      { name: 'All Services', href: '/services' },
      { name: 'Facials', href: '/services#facials' },
      { name: 'Body Treatments', href: '/services#body' },
      { name: 'Skin Analysis', href: '/services#analysis' },
    ]
  },
  { 
    name: 'Packages', 
    href: '/packages',
    hasDropdown: true,
    dropdownItems: [
      { name: 'All Packages', href: '/packages' },
      { name: 'Bridal Packages', href: '/packages#bridal' },
      { name: 'Couples Spa', href: '/packages#couples' },
      { name: 'VIP Experience', href: '/packages#vip' },
    ]
  },
  { name: 'Membership', href: '/membership' },
  { name: 'Gallery', href: '/gallery' },
  { 
    name: 'About', 
    href: '/about',
    hasDropdown: true,
    dropdownItems: [
      { name: 'Our Story', href: '/about' },
      { name: 'Our Team', href: '/about#team' },
      { name: 'FAQ', href: '/#faq' },
      { name: 'Survey', href: '/survey' },
    ]
  },
  { name: 'Contact', href: '/contact' },
  { name: 'Book Consultation', href: '/consultation' },
]

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showCartTooltip, setShowCartTooltip] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const savedTheme = localStorage.getItem('dermaspace-theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    }
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

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('dermaspace-theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('dermaspace-theme', 'dark')
    }
  }

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
          ? 'bg-white/95 backdrop-blur-md shadow-sm dark:bg-gray-950/95' 
          : 'bg-white dark:bg-gray-950'
      )}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src={isDarkMode 
                  ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
                  : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
                }
                alt="Dermaspace"
                width={140}
                height={42}
                className={cn("h-9 w-auto", isDarkMode && "brightness-0 invert")}
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
                            : "text-gray-600 hover:text-[#7B2D8E] dark:text-gray-300 dark:hover:text-white"
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
                        <div className={cn(
                          "absolute top-full left-0 mt-1 w-48 rounded-xl shadow-xl border overflow-hidden",
                          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
                        )}>
                          {link.dropdownItems?.map((item, idx) => (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setActiveDropdown(null)}
                              className={cn(
                                "block px-4 py-2.5 text-sm transition-colors",
                                idx === 0 && "font-medium",
                                isDarkMode 
                                  ? "text-gray-300 hover:bg-gray-800 hover:text-white" 
                                  : "text-gray-600 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E]"
                              )}
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors dark:text-gray-300 dark:hover:text-white"
                    >
                      {link.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Beautiful Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={cn(
                  "relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 overflow-hidden group",
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700" 
                    : "bg-[#7B2D8E]/5 hover:bg-[#7B2D8E]/10"
                )}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {/* Sun Icon */}
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className={cn(
                    "w-[18px] h-[18px] absolute transition-all duration-300",
                    isDarkMode 
                      ? "opacity-100 rotate-0 scale-100" 
                      : "opacity-0 rotate-90 scale-50"
                  )}
                >
                  <circle cx="12" cy="12" r="4" fill="#FBBF24" />
                  <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.64 5.64L4.22 4.22M19.78 19.78l-1.42-1.42M5.64 18.36l-1.42 1.42M19.78 4.22l-1.42 1.42" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                
                {/* Moon Icon */}
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className={cn(
                    "w-[18px] h-[18px] absolute transition-all duration-300",
                    isDarkMode 
                      ? "opacity-0 -rotate-90 scale-50" 
                      : "opacity-100 rotate-0 scale-100"
                  )}
                >
                  <path 
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" 
                    fill="#7B2D8E" 
                    stroke="#7B2D8E" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Beautiful Cart Icon */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowCartTooltip(true)}
                  onMouseLeave={() => setShowCartTooltip(false)}
                  onClick={() => setShowCartTooltip(!showCartTooltip)}
                  className={cn(
                    "relative w-9 h-9 flex items-center justify-center rounded-xl transition-all group",
                    isDarkMode
                      ? "bg-gray-800 hover:bg-gray-700"
                      : "bg-[#7B2D8E]/5 hover:bg-[#7B2D8E]/10"
                  )}
                  aria-label="Shopping cart - Coming soon"
                >
                  {/* Shopping Bag Icon */}
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className={cn(
                      "w-[18px] h-[18px] transition-colors",
                      isDarkMode ? "text-white" : "text-[#7B2D8E]"
                    )}
                  >
                    <path 
                      d="M6 6h12l1.5 12H4.5L6 6z" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinejoin="round"
                      fill={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(123,45,142,0.1)"}
                    />
                    <path 
                      d="M9 6V5a3 3 0 1 1 6 0v1" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Animated Badge */}
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7B2D8E] opacity-30"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-[#7B2D8E] items-center justify-center">
                      <span className="text-[9px] font-bold text-white">!</span>
                    </span>
                  </span>
                </button>
                
                {/* Cart Tooltip */}
                {showCartTooltip && (
                  <div className={cn(
                    "absolute top-full right-0 mt-2 w-52 rounded-xl p-4 shadow-xl z-50 border",
                    isDarkMode 
                      ? "bg-gray-900 border-gray-800" 
                      : "bg-white border-gray-100"
                  )}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isDarkMode ? "bg-gray-800" : "bg-[#7B2D8E]/10"
                      )}>
                        <svg viewBox="0 0 24 24" fill="none" className={cn("w-5 h-5", isDarkMode ? "text-white" : "text-[#7B2D8E]")}>
                          <path d="M6 6h12l1.5 12H4.5L6 6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          <path d="M9 6V5a3 3 0 1 1 6 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className={cn("font-semibold text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                          Shop Coming Soon
                        </p>
                        <p className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                          Stay tuned!
                        </p>
                      </div>
                    </div>
                    <p className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                      Browse and purchase premium skincare products directly from our website.
                    </p>
                    <div className={cn(
                      "absolute -top-1.5 right-5 w-3 h-3 rotate-45 border-l border-t",
                      isDarkMode 
                        ? "bg-gray-900 border-gray-800" 
                        : "bg-white border-gray-100"
                    )} />
                  </div>
                )}
              </div>

              {/* Desktop CTA */}
              <Link
                href="/booking"
                className="hidden lg:inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#5A1D6A] transition-colors"
              >
                Book Now
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={cn(
                  "lg:hidden w-9 h-9 flex items-center justify-center rounded-xl",
                  isDarkMode ? "bg-gray-800" : "bg-[#7B2D8E]/5"
                )}
                aria-label="Open menu"
              >
                <div className="flex flex-col gap-1">
                  <span className={cn(
                    "w-4 h-0.5 rounded-full transition-colors",
                    isDarkMode ? "bg-white" : "bg-[#7B2D8E]"
                  )} />
                  <span className={cn(
                    "w-3 h-0.5 rounded-full transition-colors",
                    isDarkMode ? "bg-white" : "bg-[#7B2D8E]"
                  )} />
                  <span className={cn(
                    "w-4 h-0.5 rounded-full transition-colors",
                    isDarkMode ? "bg-white" : "bg-[#7B2D8E]"
                  )} />
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
          'absolute top-0 right-0 w-full max-w-sm h-full shadow-2xl transition-transform duration-300 ease-out',
          isDarkMode ? "bg-gray-950" : "bg-white",
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}>
          <div className={cn(
            "flex items-center justify-between p-4 border-b",
            isDarkMode ? "border-gray-800" : "border-gray-100"
          )}>
            <Image
              src={isDarkMode 
                ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
                : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
              }
              alt="Dermaspace"
              width={100}
              height={30}
              className={cn("h-7 w-auto", isDarkMode && "brightness-0 invert")}
            />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-colors",
                isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
              )}
              aria-label="Close menu"
            >
              <X className={cn("w-5 h-5", isDarkMode ? "text-white" : "text-gray-900")} />
            </button>
          </div>

          <nav className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {navLinks.map((link, idx) => (
              <div key={link.name}>
                {link.hasDropdown ? (
                  <>
                    <button
                      onClick={() => setMobileExpandedMenu(mobileExpandedMenu === link.name ? null : link.name)}
                      className={cn(
                        "flex items-center justify-between w-full py-3.5 border-b",
                        isDarkMode ? "border-gray-800" : "border-gray-100"
                      )}
                      style={{
                        animation: isMobileMenuOpen ? `slideInRight 0.3s ease-out ${idx * 50}ms forwards` : 'none',
                        opacity: isMobileMenuOpen ? 1 : 0,
                      }}
                    >
                      <span className={cn(
                        "text-base font-medium",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>
                        {link.name}
                      </span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        mobileExpandedMenu === link.name && "rotate-180",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )} />
                    </button>
                    
                    {mobileExpandedMenu === link.name && (
                      <div className={cn(
                        "pl-4 py-2",
                        isDarkMode ? "bg-gray-900/50" : "bg-gray-50"
                      )}>
                        {link.dropdownItems?.map((item) => (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center justify-between py-2.5",
                              isDarkMode ? "text-gray-300" : "text-gray-600"
                            )}
                          >
                            <span className="text-sm">{item.name}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between py-3.5 border-b group",
                      isDarkMode ? "border-gray-800" : "border-gray-100"
                    )}
                    style={{
                      animation: isMobileMenuOpen ? `slideInRight 0.3s ease-out ${idx * 50}ms forwards` : 'none',
                      opacity: isMobileMenuOpen ? 1 : 0,
                    }}
                  >
                    <span className={cn(
                      "text-base font-medium group-hover:text-[#7B2D8E] transition-colors",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>
                      {link.name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
                  </Link>
                )}
              </div>
            ))}
            
            {/* Theme Toggle in Mobile Menu */}
            <button
              onClick={toggleTheme}
              className={cn(
                "flex items-center justify-between w-full py-3.5 border-b",
                isDarkMode ? "border-gray-800" : "border-gray-100"
              )}
            >
              <span className={cn(
                "text-base font-medium",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isDarkMode ? "bg-gray-800" : "bg-[#7B2D8E]/10"
              )}>
                {isDarkMode ? (
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <circle cx="12" cy="12" r="4" fill="#FBBF24" />
                    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.64 5.64L4.22 4.22M19.78 19.78l-1.42-1.42M5.64 18.36l-1.42 1.42M19.78 4.22l-1.42 1.42" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#7B2D8E" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          </nav>

          <div className={cn(
            "absolute bottom-0 left-0 right-0 p-4 border-t",
            isDarkMode ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-gray-50"
          )}>
            <Link
              href="/booking"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center w-full py-3 text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#5A1D6A] transition-colors"
            >
              Book Appointment
            </Link>
            <p className={cn(
              "mt-4 text-center text-xs",
              isDarkMode ? "text-gray-500" : "text-gray-500"
            )}>
              +234 901 797 2919
            </p>
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
      `}</style>
    </>
  )
}
