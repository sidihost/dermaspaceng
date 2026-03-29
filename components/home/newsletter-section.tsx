'use client'

import { useState } from 'react'
import { Mail, Check, ArrowRight, Gift, Star, Bell } from 'lucide-react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      if (response.ok) {
        setIsSubmitted(true)
      }
    } catch (error) {
      console.error('Newsletter error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-[#7B2D8E] rounded-2xl p-8 md:p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-[#7B2D8E]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">You're Subscribed!</h3>
            <p className="text-sm text-white/80 max-w-md mx-auto">
              Welcome to Dermaspace. Check your inbox for a welcome email with skincare tips and exclusive offers.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid md:grid-cols-5">
            {/* Left - Purple Side */}
            <div className="md:col-span-2 bg-[#7B2D8E] p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
                Join Our Beauty Community
              </h2>
              <p className="text-sm text-white/80 mb-6">
                Get skincare tips, exclusive offers, and be first to know about new treatments.
              </p>
              
              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-white">Exclusive member discounts</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-white">Weekly skincare tips</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-white">New treatment alerts</span>
                </div>
              </div>
            </div>
            
            {/* Right - Form Side */}
            <div className="md:col-span-3 p-6 md:p-8 flex items-center">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5 text-[#7B2D8E]" />
                  <span className="text-sm font-medium text-gray-900">Subscribe to Newsletter</span>
                </div>
                
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors disabled:opacity-70 whitespace-nowrap"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Subscribing...</span>
                      </>
                    ) : (
                      <>
                        <span>Subscribe</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
                
                <p className="text-xs text-gray-400 mt-3">
                  No spam, ever. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
