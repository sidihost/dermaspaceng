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
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

export function Header() {
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
      {/* Top Bar */}
      <div className="hidden lg:block bg-[#7B2D8E] text-white py-2">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <a 
              href="tel:+2349017972919" 
              className="flex items-center gap-2 hover:text-[#D4A853] transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>+234 901 797 2919</span>
            </a>
            <a 
              href="mailto:info@dermaspaceng.com"
              className="hover:text-[#D4A853] transition-colors"
            >
              info@dermaspaceng.com
            </a>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>Victoria Island & Ikoyi, Lagos</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-300',
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md border-b border-[#7B2D8E]/10' 
            : 'bg-white'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
                alt="Dermaspace Esthetic & Wellness Centre"
                width={200}
                height={50}
                className="h-12 w-auto"
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
                    className={cn(
                      'px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#7B2D8E] transition-colors flex items-center gap-1',
                      'relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-0.5 after:bg-[#7B2D8E] after:transition-all hover:after:w-full'
                    )}
                  >
                    {item.name}
                    {item.children && <ChevronDown className="w-4 h-4" />}
                  </Link>
                  
                  {/* Dropdown */}
                  {item.children && activeDropdown === item.name && (
                    <div className="absolute top-full left-0 pt-2 animate-fade-in">
                      <div className="bg-white rounded-lg border border-gray-100 py-2 min-w-[200px]">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
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

            {/* CTA Button */}
            <div className="hidden lg:flex items-center gap-4">
              <Button
                asChild
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-6"
              >
                <Link href="/booking">Book Now</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 animate-fade-in">
            <div className="px-4 py-4 space-y-2">
              {navigation.map((item) => (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className="block px-4 py-3 text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] rounded-lg transition-colors font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.children && (
                    <div className="pl-6 space-y-1 mt-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-4 px-4">
                <Button
                  asChild
                  className="w-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full"
                >
                  <Link href="/booking" onClick={() => setIsMobileMenuOpen(false)}>
                    Book Now
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
