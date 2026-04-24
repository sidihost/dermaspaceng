'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Calendar, Check, Bell, Clock, ArrowRight, Heart } from 'lucide-react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string | null
}

// Three short value props shown on the waiting-for-launch screen.
// Keeping them above the fold turns a dead "Coming Soon" page into
// something that sells the feature and gives visitors a reason to
// actually join the waitlist.
const PREVIEW_FEATURES: { icon: string; title: string; desc: string }[] = [
  {
    icon: 'calendar',
    title: 'Pick any slot',
    desc: 'See real-time openings across both clinics',
  },
  {
    icon: 'bell',
    title: 'Instant confirmation',
    desc: 'Booked and paid in under a minute',
  },
  {
    icon: 'heart',
    title: 'Save your favourites',
    desc: 'Re-book your go-to therapist in one tap',
  },
]

function FeatureIcon({ name }: { name: string }) {
  if (name === 'calendar') return <Calendar className="w-4 h-4" aria-hidden="true" />
  if (name === 'bell') return <Bell className="w-4 h-4" aria-hidden="true" />
  return <Heart className="w-4 h-4" aria-hidden="true" />
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

            // Check if user is already on the booking waitlist
            try {
              const subRes = await fetch('/api/booking-waitlist/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.user.email }),
              })
              if (subRes.ok) {
                const subData = await subRes.json()
                if (subData.subscribed) setIsSubscribed(true)
              }
            } catch {
              // Waitlist check failed, continue without it
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
      const res = await fetch('/api/booking-waitlist/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.subscribed) setIsSubscribed(true)
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
      const res = await fetch('/api/booking-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) setIsSubscribed(true)
      } else {
        console.error('Failed to join waitlist')
      }
    } catch (error) {
      console.error('Waitlist error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="bg-gray-50 min-h-screen">
      <Header />

      {/*
       * Compact hero — a flat brand-purple band (no gradients per
       * design guideline). A single decorative ring on the right
       * provides depth without layered radial washes. The launch-
       * ready waitlist states live inside the card below, so the
       * hero only has to set tone and status, not do any heavy
       * lifting on its own.
       */}
      <section className="relative overflow-hidden bg-[#7B2D8E] pt-8 pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full border border-white/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-4 w-72 h-72 rounded-full border border-white/10"
        />
        <div className="relative max-w-md mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3">
            <Calendar className="w-3 h-3 text-white" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-white uppercase tracking-[0.15em]">
              Coming Soon
            </span>
          </div>
          <h1 className="text-2xl md:text-[28px] font-bold text-white leading-tight text-balance">
            Online Booking
          </h1>
          <p className="mt-1.5 text-[13px] text-white/75 text-pretty">
            A faster, smoother way to reserve your glow-up.
          </p>
        </div>
      </section>

      {/*
       * Primary content card — pulled up over the hero with negative
       * margin so the two zones feel connected as one composition
       * rather than two stacked bands. The card also absorbs the
       * dynamic waitlist/signed-in states so the hero doesn't have
       * to resize based on auth status.
       */}
      <section className="relative -mt-14 pb-16">
        <div className="max-w-md mx-auto px-4">
          {isLoading ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 text-center">
              <div className="relative w-10 h-10 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-2 border-[#7B2D8E] border-t-transparent animate-spin" />
              </div>
              <p className="text-xs text-gray-500">Just a moment…</p>
            </div>
          ) : isSubscribed ? (
            // Signed-up-for-waitlist state — celebratory, with a
            // clear "while you wait" CTA to WhatsApp/phone so the
            // user never lands at a dead end.
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 text-center border-b border-gray-100">
                <div className="relative w-14 h-14 mx-auto mb-3">
                  <div className="absolute inset-0 rounded-full bg-[#7B2D8E]/10" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-7 h-7 text-[#7B2D8E]" strokeWidth={2.5} />
                  </div>
                </div>
                <h2 className="text-lg font-bold text-gray-900 text-balance">
                  {user ? `You\u2019re on the list, ${user.firstName}!` : 'You\u2019re on the list!'}
                </h2>
                <p className="mt-1.5 text-[13px] text-gray-500 text-pretty">
                  We&apos;ll notify <span className="font-semibold text-gray-900">{email}</span> the moment booking goes live.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2D8E]/8 text-[#7B2D8E]">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span className="text-[11px] font-semibold">Launching soon</span>
                </div>
              </div>

              <div className="p-5 bg-gray-50/50">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 text-center">
                  Book now via
                </p>
                <ContactActions />
              </div>
            </div>
          ) : (
            // Default join-the-waitlist state. Signed-in users see a
            // personalised, single-tap confirmation with their avatar;
            // guests get a minimal email form.
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Join the waitlist</h2>
                <p className="text-[13px] text-gray-500 mb-5">
                  Be first in line when online booking launches.
                </p>

                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-[#7B2D8E]/5 border border-[#7B2D8E]/15 rounded-2xl">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl || '/placeholder.svg'}
                          alt=""
                          aria-hidden="true"
                          className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#7B2D8E] flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm">
                          <span className="text-white font-semibold text-sm">
                            {user.firstName.charAt(0)}
                            {user.lastName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-[#7B2D8E] bg-white border border-[#7B2D8E]/20 rounded-full px-2 py-0.5 shrink-0">
                        Signed in
                      </span>
                    </div>

                    <button
                      onClick={handleNotify}
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-2xl hover:bg-[#5A1D6A] transition-all disabled:opacity-60 shadow-sm shadow-[#7B2D8E]/20"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Adding you…
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4" />
                          Notify me on launch
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleNotify} className="space-y-3">
                    <input
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={(e) => checkExistingSubscription(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] focus:bg-white transition-colors"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-2xl hover:bg-[#5A1D6A] transition-all disabled:opacity-60 shadow-sm shadow-[#7B2D8E]/20"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Adding you…
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4" />
                          Notify me on launch
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* What-you'll-get teaser */}
              <div className="px-6 pb-6">
                <div className="pt-5 border-t border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    What to expect
                  </p>
                  <ul className="space-y-2.5">
                    {PREVIEW_FEATURES.map((feat) => (
                      <li key={feat.title} className="flex items-start gap-3">
                        <span className="w-8 h-8 shrink-0 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
                          <FeatureIcon name={feat.icon} />
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                            {feat.title}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            {feat.desc}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-5 bg-gray-50/60 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 text-center">
                  Need to book today?
                </p>
                <ContactActions />
              </div>
            </div>
          )}

          {/* Back link */}
          <div className="mt-5 text-center">
            <Link
              href={user ? '/dashboard' : '/'}
              className="inline-flex items-center gap-1 text-[13px] text-gray-500 hover:text-[#7B2D8E] font-medium transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
              Back to {user ? 'dashboard' : 'home'}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

// Twin CTAs for booking "today". Factored out so the signed-up and
// not-signed-up states render the exact same row without duplicating
// brand SVGs. Kept inside the same file since it's booking-specific.
function ContactActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <a
        href="https://wa.me/2349167890123"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-[#7B2D8E] text-white text-[13px] font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        WhatsApp
      </a>
      <a
        href="tel:+2349167890123"
        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-900 text-[13px] font-semibold rounded-xl hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
        Call us
      </a>
    </div>
  )
}
