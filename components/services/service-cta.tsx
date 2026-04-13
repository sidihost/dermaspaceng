'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface User {
  firstName: string
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

  // Don't show CTA for logged-in users - they have personalized sections above
  if (user) {
    return null
  }

  // Default CTA for guests with improved design
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Not sure which{' '}
          <span className="relative inline-block">
            service
            <span className="absolute bottom-0 left-0 w-full h-1 bg-[#7B2D8E]/30 rounded-full" />
          </span>{' '}
          is right for you?
        </h2>
        <p className="text-base text-gray-600 mb-8 max-w-md mx-auto">
          Our expert team is here to help you choose the perfect treatment for your needs
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#7B2D8E] text-white font-medium rounded-full hover:bg-[#5A1D6A] transition-colors"
        >
          Contact Us
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  )
}
