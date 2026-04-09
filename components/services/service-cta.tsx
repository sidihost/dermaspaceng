'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, MessageCircle } from 'lucide-react'

interface User {
  firstName: string
  lastName: string
}

export default function ServiceCTA() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
      } catch {
        // Not logged in
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  if (isLoading) return null

  // Personalized CTA for logged-in users
  if (user) {
    return (
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Ready to book, {user.firstName}?
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Schedule your next treatment or reach out if you have any questions
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Book Appointment
            </Link>
            <a
              href="https://wa.me/2349167890123"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Chat with Us
            </a>
          </div>
        </div>
      </section>
    )
  }

  // Default CTA for guests
  return (
    <section className="py-12 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          Not sure which service is right for you?
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Our expert team is here to help you choose the perfect treatment
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#5A1D6A] transition-colors"
        >
          Contact Us
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  )
}
