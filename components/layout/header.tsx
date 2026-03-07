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
      {/* Top Info Bar - Desktop Only */}
      <div className="hidden lg:block bg-gradient-to-r from-[#7B2D8E]/5 to-[#D4A853]/5 border-b border-[#7B2D8E]/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <a href="tel:+2349017972919" className="flex items-center gap-2 text-gray-700 hover:text-[#7B2D8E] font-medium transition-colors">
              <Phone className="w-4 h-4 text-[#7B2D8E]" />
              +234 901 797 2919
            </a>
            <span className="text-gray-300">|</span>
            <a href="mailto:info@dermaspaceng.com" className="text-gray-700 hover:text-[#7B2D8E] font-medium transition-colors">
              info@dermaspaceng.com
            </a>
          </div>
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <MapPin className="w-4 h-4 text-[#7B2D8E]" />
            VI & Ikoyi, Lagos
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={cn(
        'sticky top-0 z-50 bg-white transition-all duration-300',
        isScrolled ? 'shadow-lg' : 'shadow-sm'
      )}>
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
                alt="Dermaspace"
                width={140}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {navigation.map((item) => (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => item.children && setActiveDropdown(item.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#7B2D8E] transition-colors flex items-center gap-1 relative group"
                  >
                    <Link href={item.href}>{item.name}</Link>
                    {item.children && <ChevronDown className="w-4 h-4" />}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#D4A853] group-hover:w-full transition-all duration-300" />
                  </button>
                  
                  {item.children && activeDropdown === item.name && (
                    <div className="absolute top-full left-0 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="bg-white rounded-xl border border-gray-200 shadow-xl py-2 min-w-[220px]">
                        {item.children.map((child, idx) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={cn(
                              'block px-5 py-3 text-sm font-medium text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors relative',
                              idx !== item.children!.length - 1 && 'border-b border-gray-100'
                            )}
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

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-4">
              <Button asChild className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-lg px-6 h-10 font-semibold">
                <Link href="/booking">Book Now</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-900" />
              ) : (
                <Menu className="w-6 h-6 text-gray-900" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 animate-in slide-in-from-top duration-300">
            <div className="px-4 py-4 space-y-1 max-h-[calc(100vh-80px)] overflow-y-auto">
              {navigation.map((item) => (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className="block px-4 py-3 text-base font-medium text-gray-900 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.children && (
                    <div className="pl-4 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className="block px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-lg transition-colors"
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
                <Button asChild className="w-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-lg h-12 font-semibold">
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
