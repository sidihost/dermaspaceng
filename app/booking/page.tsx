'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Calendar, Check, Bell } from 'lucide-react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

export default function BookingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            setEmail(data.user.email)
            
            // Check if user is already subscribed
            const subRes = await fetch('/api/newsletter/check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: data.user.email })
            })
            if (subRes.ok) {
              const subData = await subRes.json()
              if (subData.subscribed) {
                setIsSubscribed(true)
              }
            }
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

  const checkExistingSubscription = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) return
    
    try {
      const res = await fetch('/api/newsletter/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.subscribed) {
          setIsSubscribed(true)
        }
      }
    } catch {
      // Ignore errors
    }
  }

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      if (res.ok) {
        setIsSubscribed(true)
      } else {
        console.error('Failed to subscribe')
      }
    } catch (error) {
      console.error('Subscription error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <Header />
      
      {/* Hero Section - matching services page style */}
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-white uppercase tracking-widest">Coming Soon</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Online <span className="text-white/90">Booking</span>
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
            Book your appointments with just a few clicks
          </p>
          
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-8 h-0.5 bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-8 h-0.5 bg-white/30" />
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 bg-white">
        <div className="max-w-xl mx-auto px-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="relative w-10 h-10 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full border-2 border-[#7B2D8E]/20" />
                <div className="absolute inset-0 rounded-full border-2 border-[#7B2D8E] border-t-transparent animate-spin" />
              </div>
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          ) : !isSubscribed ? (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <div className="w-12 h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-[#7B2D8E]" />
              </div>
              
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Get Notified</h2>
                <p className="text-sm text-gray-600">
                  We&apos;ll let you know when online booking is ready
                </p>
              </div>
              
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="w-9 h-9 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[#7B2D8E] font-semibold text-xs">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleNotify}
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-lg hover:bg-[#6B2278] transition-colors disabled:opacity-50"
                  >
                    <Bell className="w-4 h-4" />
                    {isSubmitting ? 'Subscribing...' : 'Notify Me'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleNotify} className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => checkExistingSubscription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-lg hover:bg-[#6B2278] transition-colors disabled:opacity-50"
                  >
                    <Bell className="w-4 h-4" />
                    {isSubmitting ? 'Subscribing...' : 'Notify Me'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl p-6 text-center">
              <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">You&apos;re on the list!</h3>
              <p className="text-sm text-gray-600">
                We&apos;ll notify you at <span className="font-medium text-[#7B2D8E]">{email}</span> as soon as online booking is available
              </p>
            </div>
          )}

          {/* Current Booking Options */}
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500 mb-4">In the meantime, book via:</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://wa.me/2349167890123"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
              <a
                href="tel:+2349167890123"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-lg hover:bg-[#6B2278] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Us
              </a>
            </div>
          </div>

          {/* Back Link */}
          <div className="mt-6 text-center">
            {user ? (
              <Link href="/dashboard" className="text-sm text-[#7B2D8E] font-medium hover:underline">
                ← Back to Dashboard
              </Link>
            ) : (
              <Link href="/" className="text-sm text-[#7B2D8E] font-medium hover:underline">
                ← Back to Home
              </Link>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
