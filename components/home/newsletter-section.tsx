'use client'

import { useState } from 'react'
import { Mail, Check, Send } from 'lucide-react'

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
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative bg-[#7B2D8E] rounded-3xl overflow-hidden">
          {/* Decorative curves */}
          <svg className="absolute top-0 right-0 w-64 h-64 opacity-10" viewBox="0 0 200 200">
            <circle cx="150" cy="50" r="100" fill="white" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-48 h-48 opacity-10" viewBox="0 0 200 200">
            <circle cx="50" cy="150" r="80" fill="white" />
          </svg>
          
          {/* Wave curve at bottom */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-16 opacity-10">
              <path d="M0,60 C300,100 600,20 900,60 C1050,80 1150,40 1200,60 L1200,120 L0,120 Z" fill="white" />
            </svg>
          </div>
          
          <div className="relative grid md:grid-cols-2 gap-8 p-8 md:p-12">
            {/* Left Side - Content */}
            <div className="flex flex-col justify-center text-white">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 w-fit mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest">Newsletter</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Stay in the Loop
              </h2>
              
              <p className="text-white/80 mb-6">
                Get the latest skincare tips, exclusive offers, and updates on new treatments delivered straight to your inbox.
              </p>
              
              {/* Decorative curve */}
              <div className="mb-6">
                <svg width="120" height="20" viewBox="0 0 120 20" fill="none">
                  <path 
                    d="M0 10 Q30 0 60 10 T120 10" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="2" 
                    fill="none"
                    strokeLinecap="round"
                  />
                  <circle cx="60" cy="10" r="4" fill="white" />
                </svg>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                {['Weekly skincare tips from our experts', 'Early access to promotions', 'New treatment announcements'].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-white/90">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex items-center justify-center">
              {isSubmitted ? (
                <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl w-full">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-[#7B2D8E]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">You're Subscribed!</h3>
                  <p className="text-white/80 text-sm">
                    Welcome to the Dermaspace family. Check your inbox soon.
                  </p>
                </div>
              ) : (
                <div className="w-full bg-white rounded-2xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Subscribe Now</h3>
                  
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
                          <span>Subscribe</span>
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
