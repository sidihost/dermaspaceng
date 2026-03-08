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
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="grid lg:grid-cols-5">
            {/* Left Side - Visual */}
            <div className="lg:col-span-2 bg-[#7B2D8E] p-8 lg:p-10 relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                
                <h2 className="text-xl lg:text-2xl font-bold text-white mb-3">
                  Join Our Newsletter
                </h2>
                <p className="text-white/80 text-sm mb-8">
                  Be the first to know about exclusive offers and skincare secrets.
                </p>
                
                {/* Benefits */}
                <div className="space-y-3">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <benefit.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm text-white">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Right Side - Form */}
            <div className="lg:col-span-3 p-8 lg:p-10 flex items-center">
              {isSubmitted ? (
                <div className="w-full text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-7 h-7 text-[#7B2D8E]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">You're Subscribed!</h3>
                  <p className="text-sm text-gray-600 max-w-sm mx-auto">
                    Welcome to Dermaspace. Check your inbox for a welcome email with exclusive content.
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  <div className="mb-6">
                    <span className="inline-block px-3 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-medium rounded-full mb-3">
                      Stay Updated
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Get Skincare Tips & Exclusive Offers
                    </h3>
                    <p className="text-sm text-gray-600">
                      Subscribe to receive weekly beauty insights and member-only discounts.
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
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
