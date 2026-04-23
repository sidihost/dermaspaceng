'use client'

import { useState, useEffect } from 'react'
import { Phone } from 'lucide-react'
import Link from 'next/link'

// WhatsApp Brand Icon SVG
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

interface UserData {
  firstName: string
  lastName: string
}

export default function CTASection() {
  const [user, setUser] = useState<UserData | null>(null)
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

  // Don't render the CTA for logged-in users
  if (isLoading) {
    return null // Or a minimal skeleton
  }

  // Show a different CTA for logged-in users
  if (user) {
    return (
      <section className="py-8 mb-8 mx-4 rounded-2xl bg-[#7B2D8E]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-5">
            <h2 className="text-lg md:text-xl font-bold text-white mb-1">
              Hi {user.firstName} — good to see you.
            </h2>
            <p className="text-white/80 max-w-md mx-auto text-xs">
              Pick up where you left off.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#7B2D8E] bg-white rounded-full hover:bg-white/90 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/dashboard/bookings"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white border border-white/30 rounded-full hover:bg-white/10 transition-colors"
            >
              View Bookings
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8 mb-8 mx-4 rounded-2xl bg-[#7B2D8E]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-5">
          <h2 className="text-lg md:text-xl font-bold text-white mb-1">
            Ready to come in?
          </h2>
          <p className="text-white/80 max-w-md mx-auto text-xs">
            WhatsApp or call us to book your appointment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#7B2D8E] bg-white rounded-full hover:bg-white/90 transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            WhatsApp
          </a>
          <a
            href="tel:+2349017972919"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white border border-white/30 rounded-full hover:bg-white/10 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call Us
          </a>
        </div>


      </div>
    </section>
  )
}
