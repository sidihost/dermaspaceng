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
      <section className="py-16 bg-[#FDFBF9]">
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
    <section className="py-20 lg:py-24 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="grid md:grid-cols-5">
            {/* Left - Purple Side */}
            <div className="md:col-span-2 bg-[#7B2D8E] p-8 md:p-10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Join Our Beauty Community
              </h2>
              <p className="text-base text-white/80 mb-8">
                Get skincare tips, exclusive offers, and be first to know about new treatments.
              </p>
              
              {/* Benefits */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-base text-white">Exclusive member discounts</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-base text-white">Weekly skincare tips</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-base text-white">New treatment alerts</span>
                </div>
              </div>
            </div>
            
            {/* Right - Form Side */}
            <div className="md:col-span-3 p-8 md:p-10 flex items-center">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-5">
                  <Mail className="w-6 h-6 text-[#7B2D8E]" />
                  <span className="text-base font-semibold text-gray-900">Subscribe to Newsletter</span>
                </div>
                
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="flex-1 px-5 py-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#7B2D8E] text-white text-base font-semibold rounded-xl hover:bg-[#6B2278] transition-colors disabled:opacity-70 whitespace-nowrap"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Subscribing...</span>
                      </>
                    ) : (
                      <>
                        <span>Subscribe</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
                
                <p className="text-sm text-gray-500 mt-4">
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
