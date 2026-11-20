'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Mail, Check, ArrowRight, Info } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
  NEWSLETTER_STORAGE_KEYS,
  NEWSLETTER_SUBSCRIBED_EVENT,
  shouldShowHomepageNewsletter,
} from '@/lib/newsletter-popup'

function readSubscribedStorage(): boolean {
  try {
    return window.localStorage.getItem(NEWSLETTER_STORAGE_KEYS.subscribed) === '1'
  } catch {
    return false
  }
}

function writeSubscribedStorage() {
  try {
    window.localStorage.setItem(NEWSLETTER_STORAGE_KEYS.subscribed, '1')
  } catch {
    // Ignore storage quota or private-mode restrictions.
  }
}

export default function NewsletterSection() {
  const { isAuthenticated: isLoggedIn, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hasSubscribedBefore, setHasSubscribedBefore] = useState(false)

  useEffect(() => {
    setHasSubscribedBefore(readSubscribedStorage())

    const onSubscribed = () => {
      setHasSubscribedBefore(true)
    }
    window.addEventListener(NEWSLETTER_SUBSCRIBED_EVENT, onSubscribed)

    return () => {
      window.removeEventListener(NEWSLETTER_SUBSCRIBED_EVENT, onSubscribed)
    }
  }, [])

  const isVisible = shouldShowHomepageNewsletter({
    isLoading,
    isLoggedIn,
    subscribed: hasSubscribedBefore,
    justSubmitted: isSubmitted,
  })

  if (!isVisible) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'homepage' }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setErrorMsg(data?.error || 'Could not subscribe right now. Please try again.')
        return
      }

      writeSubscribedStorage()
      setHasSubscribedBefore(true)
      window.dispatchEvent(new Event(NEWSLETTER_SUBSCRIBED_EVENT))
      setAlreadySubscribed(Boolean(data?.alreadySubscribed))
      setIsSubmitted(true)
    } catch {
      setErrorMsg('Network issue. Please try again in a moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-[#7B2D8E] border border-[#5A1D6A] rounded-2xl p-6 md:p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3">
              {alreadySubscribed ? (
                <Info className="w-6 h-6 text-[#7B2D8E]" aria-hidden="true" />
              ) : (
                <Check className="w-6 h-6 text-[#7B2D8E]" aria-hidden="true" />
              )}
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {alreadySubscribed ? "You're already subscribed" : "Thanks for subscribing"}
            </h3>
            <p className="text-sm text-white/85 max-w-md mx-auto">
              {alreadySubscribed
                ? "This email is already on our list, so you are all set for our next monthly update."
                : "You're on the list. Look out for our next monthly update and seasonal offers in your inbox."}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-[#7B2D8E] border border-[#5A1D6A] rounded-2xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Image Side */}
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[340px] bg-[#FAF6FB] overflow-hidden">
              <Image
                src="/images/newsletter-spa-branded.jpg"
                alt="Dark-skinned woman resting peacefully in crisp white spa linens beside a white folded towel embroidered with the Dermaspace logo"
                fill
                loading="eager"
                sizes="(max-width: 768px) 100vw, 512px"
                referrerPolicy="no-referrer"
                className="object-cover object-center"
              />
            </div>

            {/* Form Side */}
            <div className="p-6 md:p-9 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 text-white/85 mb-2">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                  Newsletter
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white leading-snug mb-2">
                Stay up to date with Dermaspace
              </h2>
              <p className="text-sm text-white/85 leading-relaxed mb-5">
                Get one monthly email with practical skincare advice, seasonal offers, and early access to open appointments in VI &amp; Ikoyi.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <label htmlFor="homepage-newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="homepage-newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-white text-[#1a0d1f] placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/60"
                />

                {errorMsg && (
                  <p className="text-xs text-white bg-[#5A1D6A] rounded-lg px-3 py-2" role="alert">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#7B2D8E] text-sm font-semibold rounded-xl hover:bg-[#FAF6FB] transition-colors disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#7B2D8E]/30 border-t-[#7B2D8E] rounded-full animate-spin" />
                      <span>Subscribing...</span>
                    </>
                  ) : (
                    <>
                      <span>Subscribe</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-xs text-white/75 mt-3">
                One email a month. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
