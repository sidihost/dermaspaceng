'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Phone, ArrowRight, Sparkles } from 'lucide-react'

interface User {
  firstName: string
}

interface SubserviceFooterProps {
  serviceName: string
  relatedServices?: { name: string; href: string }[]
}

export default function SubserviceFooter({ serviceName, relatedServices = [] }: SubserviceFooterProps) {
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

  // Logged-in user view - more personalized and subtle
  if (user) {
    return (
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          {/* Quick action bar */}
          <div className="bg-gradient-to-r from-[#7B2D8E]/5 via-[#7B2D8E]/10 to-[#7B2D8E]/5 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Ready to book your {serviceName.toLowerCase()} session?
                </p>
                <p className="text-xs text-gray-500">
                  Reach out to us to schedule your appointment
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <a
                  href="https://wa.me/2349167890123"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
                <a
                  href="tel:+2349167890123"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6A2579] transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </a>
              </div>
            </div>
          </div>
          
          {/* Related services suggestion */}
          {relatedServices.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400 mb-3">You might also like</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {relatedServices.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-[#7B2D8E]/10 text-gray-600 hover:text-[#7B2D8E] text-xs font-medium rounded-full transition-colors"
                  >
                    {service.name}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    )
  }

  // Guest view - helpful info without being pushy
  return (
    <section className="py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        {/* Simple, elegant contact section */}
        <div className="text-center">
          {/* Decorative element */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-0.5 bg-[#7B2D8E]/20" />
            <Sparkles className="w-4 h-4 text-[#7B2D8E]/40" />
            <div className="w-8 h-0.5 bg-[#7B2D8E]/20" />
          </div>
          
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Interested in {serviceName.toLowerCase()}?
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Contact us to discuss your needs and book your appointment
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://wa.me/2349167890123"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Book via WhatsApp
            </a>
            <a
              href="tel:+2349167890123"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6A2579] transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call to Book
            </a>
          </div>
          
          {/* Related services suggestion */}
          {relatedServices.length > 0 && (
            <div className="mt-10 pt-8 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-4">Explore more services</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {relatedServices.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-[#7B2D8E]/10 text-gray-600 hover:text-[#7B2D8E] text-sm font-medium rounded-full transition-colors"
                  >
                    {service.name}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
