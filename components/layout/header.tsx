'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ChevronDown, Phone, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Home', href: '/' },
  { 
    name: 'Services', 
    href: '/services',
    children: [
      { name: 'Body Treatments', href: '/services/body-treatments' },
      { name: 'Facial Treatments', href: '/services/facial-treatments' },
      { name: 'Nail Care', href: '/services/nail-care' },
      { name: 'Waxing', href: '/services/waxing' },
    ]
  },
  { name: 'Packages', href: '/packages' },
  { name: 'Membership', href: '/membership' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-[#7B2D8E] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <p className="text-sm">
            Welcome to Dermaspace Esthetic & Wellness Centre
          </p>
        </div>
      </div>

      {/* Top Bar - Desktop */}
      <div className="hidden lg:block bg-white border-b border-gray-100 py-2">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <a href="tel:+2349017972919" className="flex items-center gap-2 text-gray-600 hover:text-[#7B2D8E]">
              <Phone className="w-4 h-4" />
              +234 901 797 2919
            </a>
            <span className="text-gray-300">|</span>
            <a href="mailto:info@dermaspaceng.com" className="text-gray-600 hover:text-[#7B2D8E]">
              info@dermaspaceng.com
            </a>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-[#7B2D8E]" />
            Victoria Island & Ikoyi, Lagos
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={cn(
        'sticky top-0 z-50 bg-white transition-shadow duration-300',
        isScrolled && 'shadow-sm'
      )}>
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
                alt="Dermaspace"
                width={160}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => item.children && setActiveDropdown(item.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href={item.href}
                    className="px-4 py-2 text-sm text-gray-700 hover:text-[#7B2D8E] transition-colors flex items-center gap-1"
                  >
                    {item.name}
                    {item.children && <ChevronDown className="w-3.5 h-3.5" />}
                  </Link>
                  
                  {item.children && activeDropdown === item.name && (
                    <div className="absolute top-full left-0 pt-2">
                      <div className="bg-white rounded-xl border border-gray-100 shadow-lg py-2 min-w-[200px]">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E]"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden lg:block">
              <Button asChild className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-6 h-10">
                <Link href="/booking">Book Now</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-1">
              {navigation.map((item) => (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className="block px-4 py-3 text-base text-gray-700 hover:text-[#7B2D8E]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.children && (
                    <div className="pl-6 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-gray-500 hover:text-[#7B2D8E]"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-4">
                <Button asChild className="w-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full h-12">
                  <Link href="/booking" onClick={() => setIsMobileMenuOpen(false)}>
                    Book Appointment
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
