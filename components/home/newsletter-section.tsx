'use client'

import { useState } from 'react'
import { Mail, Check, ArrowRight, Gift, Sparkles, Bell } from 'lucide-react'

const benefits = [
  { icon: Gift, text: 'Exclusive Offers' },
  { icon: Sparkles, text: 'Beauty Tips' },
  { icon: Bell, text: 'New Treatments' },
]

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

  return (
    <section className="py-16 bg-[#FDFBF9]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-[#7B2D8E] rounded-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Left Side - Content */}
            <div className="p-8 md:p-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full mb-6">
                <Mail className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-medium text-white">Newsletter</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Join Our Beauty Community
              </h2>
              <p className="text-white/80 text-sm mb-8 max-w-md">
                Be the first to know about exclusive offers, skincare secrets, and new treatments at Dermaspace.
              </p>
              
              {/* Benefits */}
              <div className="flex flex-wrap gap-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
                    <benefit.icon className="w-4 h-4 text-white" />
                    <span className="text-xs font-medium text-white">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Right Side - Form */}
            <div className="bg-white p-8 md:p-12 flex items-center">
              {isSubmitted ? (
                <div className="w-full text-center">
                  <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-[#7B2D8E]" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">You're Subscribed!</h3>
                  <p className="text-sm text-gray-600">
                    Welcome to Dermaspace. Check your inbox for a welcome email.
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Get Skincare Tips & Offers
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Subscribe for weekly beauty insights and member-only discounts.
                  </p>
                  
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Subscribing...</span>
                        </>
                      ) : (
                        <>
                          <span>Subscribe Now</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                  
                  <p className="text-xs text-gray-400 mt-4 text-center">
                    No spam. Unsubscribe anytime.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
