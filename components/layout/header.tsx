'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X, ChevronRight, ShoppingBag } from 'lucide-react'
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
  { name: 'Laser Tech', href: 'https://laser-tech.dermaspaceng.com', external: true },
]

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showCartTooltip, setShowCartTooltip] = useState(false)
  const [showBanner, setShowBanner] = useState(true)

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
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
      )}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left side spacer on mobile */}
            <div className="w-10 lg:hidden" />

            {/* Logo - Center on mobile, left on desktop */}
            <Link href="/" className="absolute left-1/2 -translate-x-1/2 lg:relative lg:left-0 lg:translate-x-0 flex-shrink-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
                alt="Dermaspace"
                width={120}
                height={36}
                className="h-8 w-auto"
                priority
              />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              {/* Cart Icon - Coming Soon */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowCartTooltip(true)}
                  onMouseLeave={() => setShowCartTooltip(false)}
                  onClick={() => setShowCartTooltip(!showCartTooltip)}
                  className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors group"
                  aria-label="Shopping cart - Coming soon"
                >
                  <ShoppingBag className="w-5 h-5 text-gray-600 group-hover:text-[#7B2D8E] transition-colors" />
                  {/* Animated badge */}
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#D4A853] rounded-full flex items-center justify-center">
                    <span className="absolute inset-0 bg-[#D4A853] rounded-full animate-ping opacity-60" />
                    <span className="relative text-[8px] font-bold text-white">!</span>
                  </span>
                </button>
                
                {/* Cart Tooltip */}
                {showCartTooltip && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-gray-900 text-white text-xs rounded-xl p-3.5 shadow-xl z-50">
                    <p className="font-semibold text-sm mb-1">Shop Coming Soon!</p>
                    <p className="text-gray-300 leading-relaxed">Browse and buy skincare products online. Stay tuned!</p>
                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-gray-900 rotate-45" />
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

              {/* Mobile Menu Button - Right side */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Open menu"
              >
                <div className="flex flex-col gap-1">
                  <span className="w-4 h-[2px] bg-[#7B2D8E] rounded-full" />
                  <span className="w-3 h-[2px] bg-[#7B2D8E] rounded-full" />
                  <span className="w-4 h-[2px] bg-[#7B2D8E] rounded-full" />
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
        {/* Backdrop */}
        <div 
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity duration-300',
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div className={cn(
          'absolute top-0 right-0 w-full max-w-sm h-full bg-white shadow-2xl transition-transform duration-300 ease-out',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}>
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
              alt="Dermaspace"
              width={100}
              height={30}
              className="h-7 w-auto"
            />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* Menu Links */}
          <nav className="p-4">
            {navLinks.map((link, idx) => (
              <Link
                key={link.name}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between py-4 border-b border-gray-100 group"
                style={{
                  animation: isMobileMenuOpen ? `slideInRight 0.3s ease-out ${idx * 50}ms forwards` : 'none',
                  opacity: isMobileMenuOpen ? 1 : 0,
                }}
              >
                <span className="text-base font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                  {link.name}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </nav>

          {/* Menu Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50">
            <Link
              href="/booking"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center w-full py-3 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              Book Appointment
            </Link>
            <p className="mt-4 text-center text-xs text-gray-500">
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
