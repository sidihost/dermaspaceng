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
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm dark:bg-gray-900/95' : 'bg-white dark:bg-gray-900'
      )}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Left on all screens */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
                alt="Dermaspace"
                width={140}
                height={42}
                className="h-9 w-auto"
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
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors dark:text-gray-300 dark:hover:text-[#D4A853]"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle - Desktop only */}
              <button
                onClick={toggleTheme}
                className="hidden md:flex w-9 h-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-[#D4A853]" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {/* Cart Icon - Beautiful Design */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowCartTooltip(true)}
                  onMouseLeave={() => setShowCartTooltip(false)}
                  onClick={() => setShowCartTooltip(!showCartTooltip)}
                  className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all group border border-gray-100 dark:border-gray-700"
                  aria-label="Shopping cart - Coming soon"
                >
                  {/* Custom Cart Icon */}
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="w-5 h-5 text-gray-600 group-hover:text-[#7B2D8E] transition-colors dark:text-gray-300"
                    stroke="currentColor" 
                    strokeWidth="1.5"
                  >
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  
                  {/* Animated Badge */}
                  <span className="absolute -top-1 -right-1 flex items-center justify-center">
                    <span className="absolute w-5 h-5 bg-[#D4A853]/30 rounded-full animate-ping" />
                    <span className="relative w-5 h-5 bg-gradient-to-br from-[#D4A853] to-[#C49843] rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-[9px] font-bold text-white">!</span>
                    </span>
                  </span>
                </button>
                
                {/* Cart Tooltip */}
                {showCartTooltip && (
                  <div className="absolute top-full right-0 mt-3 w-56 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-2xl z-50 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-[#7B2D8E]" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">Shop Coming Soon</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Stay tuned!</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      Browse and purchase skincare products directly from our website.
                    </p>
                    <div className="absolute -top-2 right-6 w-4 h-4 bg-white dark:bg-gray-800 rotate-45 border-l border-t border-gray-100 dark:border-gray-700" />
                  </div>
                )}
              </div>

              {/* Desktop CTA */}
              <Link
                href="/booking"
                className="hidden lg:inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
              >
                Book Now
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Open menu"
              >
                <div className="flex flex-col gap-[5px]">
                  <span className="w-5 h-[2px] bg-[#7B2D8E] rounded-full" />
                  <span className="w-3.5 h-[2px] bg-[#7B2D8E] rounded-full" />
                  <span className="w-5 h-[2px] bg-[#7B2D8E] rounded-full" />
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
          'absolute top-0 right-0 w-full max-w-sm h-full bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ease-out',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}>
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
              alt="Dermaspace"
              width={100}
              height={30}
              className="h-7 w-auto"
            />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
          </div>

          <nav className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {navLinks.map((link, idx) => (
              <Link
                key={link.name}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 group"
                style={{
                  animation: isMobileMenuOpen ? `slideInRight 0.3s ease-out ${idx * 50}ms forwards` : 'none',
                  opacity: isMobileMenuOpen ? 1 : 0,
                }}
              >
                <span className="text-base font-medium text-gray-900 dark:text-white group-hover:text-[#7B2D8E] dark:group-hover:text-[#D4A853] transition-colors">
                  {link.name}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
            
            {/* Theme Toggle in Mobile Menu */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between w-full py-4 border-b border-gray-100 dark:border-gray-800"
            >
              <span className="text-base font-medium text-gray-900 dark:text-white">
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-[#D4A853]" />
              ) : (
                <Moon className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <Link
              href="/booking"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center w-full py-3 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              Book Appointment
            </Link>
            <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
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
