'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ChevronDown, Phone, MapPin, Volume2, VolumeX } from 'lucide-react'
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

const welcomeMessages = [
  "Welcome to Dermaspace Esthetic & Wellness Centre",
  "Experience Premium Spa Treatments in Lagos",
  "Your Journey to Radiant Skin Starts Here",
  "Book Your Appointment Today"
]

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Typing effect
  useEffect(() => {
    const message = welcomeMessages[currentMessageIndex]
    
    if (isTyping) {
      if (displayedText.length < message.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(message.slice(0, displayedText.length + 1))
        }, 50)
        return () => clearTimeout(timeout)
      } else {
        const timeout = setTimeout(() => {
          setIsTyping(false)
        }, 2000)
        return () => clearTimeout(timeout)
      }
    } else {
      if (displayedText.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1))
        }, 30)
        return () => clearTimeout(timeout)
      } else {
        setCurrentMessageIndex((prev) => (prev + 1) % welcomeMessages.length)
        setIsTyping(true)
      }
    }
  }, [displayedText, isTyping, currentMessageIndex])

  const toggleMusic = () => {
    const audio = document.getElementById('spa-audio') as HTMLAudioElement
    if (audio) {
      if (isMusicPlaying) {
        audio.pause()
      } else {
        audio.play()
      }
      setIsMusicPlaying(!isMusicPlaying)
    }
  }

  return (
    <>
      {/* Background Audio */}
      <audio
        id="spa-audio"
        loop
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3"
        preload="none"
      />

      {/* Announcement Bar with Typing Effect */}
      <div className="bg-[#7B2D8E] text-white py-2.5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-white/70 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
            </div>
            <p className="text-sm font-medium min-h-[20px]">
              {displayedText}
              <span className="inline-block w-0.5 h-4 bg-white/80 ml-0.5 animate-pulse" />
            </p>
          </div>
        </div>
      </div>

      {/* Top Bar */}
      <div className="hidden lg:block bg-[#f8f5fc] border-b border-[#7B2D8E]/10 py-2.5">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm">
          <div className="flex items-center gap-8">
            <a 
              href="tel:+2349017972919" 
              className="flex items-center gap-2 text-gray-600 hover:text-[#7B2D8E] transition-colors"
            >
              <Phone className="w-4 h-4 text-[#7B2D8E]" />
              <span>+234 901 797 2919</span>
            </a>
            <a 
              href="mailto:info@dermaspaceng.com"
              className="text-gray-600 hover:text-[#7B2D8E] transition-colors"
            >
              info@dermaspaceng.com
            </a>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4 text-[#7B2D8E]" />
              <span>Victoria Island & Ikoyi, Lagos</span>
            </div>
            {/* Music Toggle */}
            <button
              onClick={toggleMusic}
              className="flex items-center gap-2 text-gray-600 hover:text-[#7B2D8E] transition-colors"
              aria-label={isMusicPlaying ? 'Mute spa music' : 'Play spa music'}
            >
              {isMusicPlaying ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="text-xs">{isMusicPlaying ? 'Music On' : 'Music Off'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-300',
          isScrolled 
            ? 'bg-white/98 backdrop-blur-md shadow-sm' 
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
                width={180}
                height={45}
                className="h-11 w-auto"
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
                      'px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-[#7B2D8E] transition-colors flex items-center gap-1',
                      'relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-0.5 after:bg-[#7B2D8E] after:transition-all hover:after:w-3/4'
                    )}
                  >
                    {item.name}
                    {item.children && <ChevronDown className="w-4 h-4" />}
                  </Link>
                  
                  {/* Dropdown */}
                  {item.children && activeDropdown === item.name && (
                    <div className="absolute top-full left-0 pt-2 animate-fade-in">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-[#7B2D8E]/5 py-3 min-w-[220px] overflow-hidden">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/30" />
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
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-7 h-11 text-sm font-medium shadow-lg shadow-[#7B2D8E]/20"
              >
                <Link href="/booking">Book Now</Link>
              </Button>
            </div>

            {/* Mobile Menu Button - Beautiful Hamburger */}
            <button
              className="lg:hidden relative w-10 h-10 flex items-center justify-center rounded-xl bg-[#7B2D8E]/5 hover:bg-[#7B2D8E]/10 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <div className="relative w-5 h-4 flex flex-col justify-between">
                <span 
                  className={cn(
                    "w-full h-0.5 bg-[#7B2D8E] rounded-full transition-all duration-300 origin-left",
                    isMobileMenuOpen && "rotate-45 translate-y-0"
                  )} 
                />
                <span 
                  className={cn(
                    "w-3/4 h-0.5 bg-[#7B2D8E] rounded-full transition-all duration-300 self-end",
                    isMobileMenuOpen && "opacity-0 translate-x-2"
                  )} 
                />
                <span 
                  className={cn(
                    "w-full h-0.5 bg-[#7B2D8E] rounded-full transition-all duration-300 origin-left",
                    isMobileMenuOpen && "-rotate-45 translate-y-0"
                  )} 
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu - Beautiful Slide-in */}
        <div className={cn(
          "lg:hidden fixed inset-x-0 top-20 bottom-0 bg-white transition-all duration-500 ease-out z-40",
          isMobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        )}>
          <div className="h-full overflow-auto">
            <div className="px-6 py-8 space-y-2">
              {navigation.map((item, index) => (
                <div 
                  key={item.name}
                  className={cn(
                    "transition-all duration-500",
                    isMobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                  )}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-4 py-4 text-lg font-medium text-gray-800 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-xl transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                    {item.children && <ChevronDown className="w-5 h-5" />}
                  </Link>
                  {item.children && (
                    <div className="pl-4 space-y-1 mt-2 border-l-2 border-[#7B2D8E]/20 ml-4">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className="block px-4 py-3 text-base text-gray-600 hover:text-[#7B2D8E] transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Mobile Music Toggle */}
              <div className="pt-4 px-4">
                <button
                  onClick={toggleMusic}
                  className="flex items-center gap-3 w-full px-4 py-4 text-gray-600 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-xl transition-colors"
                >
                  {isMusicPlaying ? (
                    <Volume2 className="w-5 h-5 text-[#7B2D8E]" />
                  ) : (
                    <VolumeX className="w-5 h-5" />
                  )}
                  <span>{isMusicPlaying ? 'Spa Music Playing' : 'Play Spa Music'}</span>
                </button>
              </div>

              <div className="pt-6 px-4">
                <Button
                  asChild
                  className="w-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full h-14 text-base font-medium shadow-lg shadow-[#7B2D8E]/20"
                >
                  <Link href="/booking" onClick={() => setIsMobileMenuOpen(false)}>
                    Book Appointment
                  </Link>
                </Button>
              </div>

              {/* Contact Info */}
              <div className="pt-8 px-4 space-y-4 border-t border-gray-100 mt-6">
                <a 
                  href="tel:+2349017972919" 
                  className="flex items-center gap-3 text-gray-600"
                >
                  <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-[#7B2D8E]" />
                  </div>
                  <span>+234 901 797 2919</span>
                </a>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                  </div>
                  <span>Victoria Island & Ikoyi, Lagos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
