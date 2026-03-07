'use client'

import { useState } from 'react'
import { Mail, Check, Send, Sparkles } from 'lucide-react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  return (
    <section className="py-16 bg-[#FDFBF9]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Decorative accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7B2D8E] via-[#D4A853] to-[#7B2D8E]" />
          
          <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
            {/* Left Side - Content */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 w-fit mb-4">
                <Sparkles className="w-3.5 h-3.5 text-[#7B2D8E]" />
                <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Newsletter</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Stay in the <span className="text-[#7B2D8E]">Loop</span>
              </h2>
              
              <p className="text-gray-600 mb-6">
                Get the latest skincare tips, exclusive offers, and updates on new treatments delivered straight to your inbox.
              </p>
              
              {/* Decorative divider */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-0.5 rounded-full bg-[#7B2D8E]/30" />
                <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
                <div className="w-8 h-0.5 rounded-full bg-[#7B2D8E]/30" />
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                {['Weekly skincare tips from our experts', 'Early access to promotions', 'New treatment announcements'].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#D4A853]/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#D4A853]" />
                    </div>
                    <span className="text-sm text-gray-600">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex items-center justify-center">
              {isSubmitted ? (
                <div className="text-center p-8 bg-[#7B2D8E]/5 rounded-2xl w-full">
                  <div className="w-16 h-16 rounded-full bg-[#7B2D8E] flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">You're Subscribed!</h3>
                  <p className="text-gray-600 text-sm">
                    Welcome to the Dermaspace family. Check your inbox soon.
                  </p>
                </div>
              ) : (
                <div className="w-full bg-[#FDFBF9] rounded-2xl p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="newsletter-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          id="newsletter-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E] bg-white"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Subscribing...</span>
                        </>
                      ) : (
                        <>
                          <span>Subscribe Now</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                  
                  <p className="text-center text-xs text-gray-500 mt-4">
                    No spam, ever. Unsubscribe anytime.
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
