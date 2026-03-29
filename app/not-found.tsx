'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Home, ArrowLeft, Search, Phone } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
              alt="Dermaspace"
              width={140}
              height={42}
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg text-center">
          {/* 404 Visual */}
          <div className="relative mb-8">
            <div className="text-[150px] md:text-[200px] font-bold text-[#7B2D8E]/10 leading-none select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                <Search className="w-10 h-10 text-[#7B2D8E]" />
              </div>
            </div>
          </div>

          {/* Text */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Page Not Found
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Oops! The page you're looking for seems to have wandered off for a spa day. Let's get you back on track.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Homepage
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>

          {/* Quick Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Or try one of these popular pages:</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { name: 'Services', href: '/services' },
                { name: 'Book Appointment', href: '/booking' },
                { name: 'Contact Us', href: '/contact' },
                { name: 'About Us', href: '/about' },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="px-4 py-2 text-sm text-[#7B2D8E] bg-[#7B2D8E]/5 rounded-full hover:bg-[#7B2D8E]/10 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Help */}
          <div className="mt-8 p-4 bg-white rounded-xl border border-gray-100">
            <p className="text-sm text-gray-600 mb-2">Need help? Contact us:</p>
            <a
              href="tel:+2349017972919"
              className="inline-flex items-center gap-2 text-[#7B2D8E] font-medium hover:underline"
            >
              <Phone className="w-4 h-4" />
              +234 901 797 2919
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
