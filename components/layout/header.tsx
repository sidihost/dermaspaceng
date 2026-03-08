'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X, ChevronRight, ChevronDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserData {
  firstName: string
  lastName: string
  email: string
}

const navLinks = [
  { name: 'Services', href: '/services' },
  { name: 'Packages', href: '/packages' },
  { name: 'Membership', href: '/membership' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
          }
        }
      } catch { /* ignore */ }
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

  return (
    <>
      <header className={cn(
        'sticky top-0 z-50 transition-all duration-200',
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
      )}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-pMOw8baIgQKWjuvl5Y8zFWVIOKuGPr.webp"
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
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Profile or Login */}
              {user ? (
                <Link
                  href="/dashboard"
                  className="hidden lg:flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-medium">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </div>
                </Link>
              ) : (
                <Link
                  href="/signin"
                  className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#7B2D8E]"
                >
                  <User className="w-4 h-4" />
                  Login
                </Link>
              )}

              {/* Book CTA */}
              <Link
                href="/booking"
                className="hidden lg:inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#7B2D8E] rounded-lg hover:bg-[#5A1D6A] transition-colors"
              >
                Book Now
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100"
                aria-label="Open menu"
              >
                <div className="flex flex-col gap-1">
                  <span className="w-4 h-0.5 rounded-full bg-gray-600" />
                  <span className="w-3 h-0.5 rounded-full bg-gray-600" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={cn(
        'fixed inset-0 z-[100] transition-all duration-300',
        isMobileMenuOpen ? 'visible' : 'invisible'
      )}>
        <div 
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity duration-300',
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        <div className={cn(
          'absolute top-0 right-0 w-full max-w-xs h-full bg-white transition-transform duration-300',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}>
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-pMOw8baIgQKWjuvl5Y8zFWVIOKuGPr.webp"
              alt="Dermaspace"
              width={100}
              height={30}
              className="h-6 w-auto"
            />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <nav className="p-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between py-3 border-b border-gray-100 text-sm font-medium text-gray-900 hover:text-[#7B2D8E]"
              >
                {link.name}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50">
            <Link
              href="/booking"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center w-full py-2.5 text-sm font-medium text-white bg-[#7B2D8E] rounded-lg"
            >
              Book Appointment
            </Link>
            <p className="mt-3 text-center text-xs text-gray-500">+234 901 797 2919</p>
          </div>
        </div>
      </div>
    </>
  )
}
