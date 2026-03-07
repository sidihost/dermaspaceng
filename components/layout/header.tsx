'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X, ChevronRight, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Services', href: '/services' },
  { name: 'Packages', href: '/packages' },
  { name: 'Membership', href: '/membership' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
  { name: 'Book Consultation', href: '/free-consultation' },
  { name: 'Survey', href: '/survey' },
  { name: 'Laser Tech', href: 'https://laser-tech.dermaspaceng.com', external: true },
]

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showCartTooltip, setShowCartTooltip] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)

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
            {/* Logo - Left on all screens */}
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

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.slice(0, 8).map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors dark:text-gray-300 dark:hover:text-white"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  isDarkMode 
                    ? "bg-gray-800 text-white hover:bg-gray-700" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              {/* Cart Icon - Smaller and cleaner */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowCartTooltip(true)}
                  onMouseLeave={() => setShowCartTooltip(false)}
                  onClick={() => setShowCartTooltip(!showCartTooltip)}
                  className={cn(
                    "relative w-8 h-8 flex items-center justify-center rounded-full transition-all",
                    isDarkMode
                      ? "bg-gray-800 hover:bg-gray-700"
                      : "bg-gray-100 hover:bg-gray-200"
                  )}
                  aria-label="Shopping cart - Coming soon"
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isDarkMode ? "text-white" : "text-gray-600"
                    )}
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  
                  {/* Badge */}
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#7B2D8E] rounded-full flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">!</span>
                  </span>
                </button>
                
                {/* Cart Tooltip */}
                {showCartTooltip && (
                  <div className={cn(
                    "absolute top-full right-0 mt-2 w-48 rounded-xl p-3 shadow-xl z-50 border",
                    isDarkMode 
                      ? "bg-gray-900 border-gray-800" 
                      : "bg-white border-gray-100"
                  )}>
                    <p className={cn(
                      "font-semibold text-sm mb-1",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>Shop Coming Soon</p>
                    <p className={cn(
                      "text-xs",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      Browse and purchase skincare products directly from our website.
                    </p>
                    <div className={cn(
                      "absolute -top-1.5 right-4 w-3 h-3 rotate-45 border-l border-t",
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
                className="hidden lg:inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
              >
                Book Now
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-8 h-8 flex items-center justify-center"
                aria-label="Open menu"
              >
                <div className="flex flex-col gap-1">
                  <span className={cn(
                    "w-5 h-0.5 rounded-full transition-colors",
                    isDarkMode ? "bg-white" : "bg-gray-800"
                  )} />
                  <span className={cn(
                    "w-3.5 h-0.5 rounded-full transition-colors",
                    isDarkMode ? "bg-white" : "bg-gray-800"
                  )} />
                  <span className={cn(
                    "w-5 h-0.5 rounded-full transition-colors",
                    isDarkMode ? "bg-white" : "bg-gray-800"
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
                "w-10 h-10 flex items-center justify-center rounded-full transition-colors",
                isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
              )}
              aria-label="Close menu"
            >
              <X className={cn("w-5 h-5", isDarkMode ? "text-white" : "text-gray-900")} />
            </button>
          </div>

          <nav className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {navLinks.map((link, idx) => (
              <Link
                key={link.name}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between py-4 border-b group",
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
            ))}
            
            {/* Theme Toggle in Mobile Menu */}
            <button
              onClick={toggleTheme}
              className={cn(
                "flex items-center justify-between w-full py-4 border-b",
                isDarkMode ? "border-gray-800" : "border-gray-100"
              )}
            >
              <span className={cn(
                "text-base font-medium",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-white" />
              ) : (
                <Moon className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </nav>

          <div className={cn(
            "absolute bottom-0 left-0 right-0 p-4 border-t",
            isDarkMode ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-gray-50"
          )}>
            <Link
              href="/booking"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center w-full py-3 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
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
