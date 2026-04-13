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

  // Default CTA for guests with card design
  return (
    <section className="px-4 pb-24 pt-8">
      <div className="max-w-xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Not sure which{' '}
            <span className="relative inline-block text-[#7B2D8E]">
              service
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#7B2D8E]" />
            </span>{' '}
            is right for you?
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
      </div>
    </section>
  )
}
