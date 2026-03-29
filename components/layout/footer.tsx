'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Phone, Mail, MapPin, Clock, User, ArrowRight } from 'lucide-react'

export default function Footer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setIsLoggedIn(true)
          }
        }
      } catch { /* ignore */ }
    }
    checkAuth()
  }, [])

  return (
    <footer className="bg-[#5A1D6A] text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        {/* Top Section - Logo and CTA */}
        <div className="flex flex-col gap-6 pb-10 border-b border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex flex-col gap-4 max-w-md">
              <Link href="/" className="inline-block">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
                  alt="Dermaspace"
                  width={140}
                  height={42}
                  className="h-10 w-auto brightness-0 invert"
                />
              </Link>
              <p className="text-white/70 text-sm leading-relaxed">
                Dermaspace is a premier spa and wellness centre in Lagos, Nigeria. Since 2019, we&apos;ve been dedicated to providing exceptional skincare treatments, relaxing massages, and holistic wellness experiences that help you look and feel your absolute best.
              </p>
            </div>
          </div>
        </div>

        {/* Links Grid - Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 py-8 sm:py-10">
          {/* Services */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-white mb-3 sm:mb-4">Services</h3>
            <ul className="space-y-2">
              {[
                { name: 'Body Treatments', href: '/services/body-treatments' },
                { name: 'Facial Treatments', href: '/services/facial-treatments' },
                { name: 'Nail Care', href: '/services/nail-care' },
                { name: 'Waxing', href: '/services/waxing' },
                { name: 'All Services', href: '/services' },
              ].map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-white mb-3 sm:mb-4">Company</h3>
            <ul className="space-y-2">
              {[
                { name: 'About Us', href: '/about' },
                { name: 'Gallery', href: '/gallery' },
                { name: 'Packages', href: '/packages' },
                { name: 'Membership', href: '/membership' },
                { name: 'Gift Cards', href: '/gift-cards' },
              ].map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-white mb-3 sm:mb-4">Support</h3>
            <ul className="space-y-2">
              {[
                { name: 'Contact Us', href: '/contact' },
                { name: 'Free Consultation', href: '/consultation' },
                { name: 'Book Appointment', href: '/booking' },
                { name: 'Give Feedback', href: '/feedback' },
              ].map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/laser-tech" className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                  Laser Tech
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-white mb-3 sm:mb-4">Contact</h3>
            <ul className="space-y-2">
              <li>
                <a href="tel:+2349017972919" className="flex items-center gap-2 text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>+234 901 797 2919</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@dermaspaceng.com" className="flex items-center gap-2 text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="break-all">info@dermaspaceng.com</span>
                </a>
              </li>
              <li className="flex items-center gap-2 text-xs sm:text-sm text-white/60">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>Mon - Sat: 9am - 7pm</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Locations - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-6 sm:py-8 border-t border-white/15">
          <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-white/10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-white mb-0.5 sm:mb-1">Victoria Island</p>
              <p className="text-[11px] sm:text-xs text-white/60 break-words leading-relaxed">237B Muri Okunola Street, VI, Lagos</p>
              <a href="tel:+2349061836625" className="text-[11px] sm:text-xs text-white/80 hover:text-white hover:underline mt-1 inline-block">+234 906 183 6625</a>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-white/10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-white mb-0.5 sm:mb-1">Ikoyi</p>
              <p className="text-[11px] sm:text-xs text-white/60 break-words leading-relaxed">44A, Awolowo Road, Ikoyi, Lagos</p>
              <a href="tel:+2349013134945" className="text-[11px] sm:text-xs text-white/80 hover:text-white hover:underline mt-1 inline-block">+234 901 313 4945</a>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Responsive */}
        <div className="pt-6 sm:pt-8 border-t border-white/15">
          <div className="flex flex-col gap-5 sm:gap-6">
            {/* Row 1: Social + Account */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Social Links */}
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs text-white/50 mr-1 hidden sm:inline">Follow</span>
                <a
                  href="https://instagram.com/dermaspace.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://wa.me/+2349013134945"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="WhatsApp"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
                <a
                  href="https://x.com/DermaspaceN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="Twitter/X"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>

              {/* Account Links */}
              <div className="flex items-center gap-4">
                {isLoggedIn ? (
                  <Link 
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4" />
                    My Account
                  </Link>
                ) : (
                  <>
                    <Link 
                      href="/signin"
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link 
                      href="/signup"
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Copyright - Always at bottom */}
            <div className="text-center sm:text-left">
              <p className="text-xs text-white/60">
                © {new Date().getFullYear()} Dermaspace Esthetic & Wellness Centre. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
