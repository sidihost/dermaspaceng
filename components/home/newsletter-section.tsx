'use client'

import { useState } from 'react'
import { Mail, Check, Send, ArrowRight } from 'lucide-react'

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
      <div className="max-w-6xl mx-auto px-4">
        {/* Full width card */}
        <div className="relative bg-[#7B2D8E] rounded-3xl overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
          
          {/* Curved lines decoration */}
          <svg className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" preserveAspectRatio="none">
            <path d="M0,50 Q400,100 800,50 T1600,50" stroke="white" strokeWidth="2" fill="none" />
            <path d="M0,100 Q400,150 800,100 T1600,100" stroke="white" strokeWidth="1" fill="none" />
          </svg>
          
          <div className="relative px-6 py-12 md:px-12 md:py-16">
            {isSubmitted ? (
              <div className="max-w-lg mx-auto text-center">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-[#7B2D8E]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">You're Subscribed!</h3>
                <p className="text-white/80">
                  Welcome to the Dermaspace family. Check your inbox for skincare tips and exclusive offers.
                </p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 mb-4">
                    <span className="text-xs font-semibold text-white uppercase tracking-widest">Newsletter</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    Stay Updated with <span className="opacity-80">Dermaspace</span>
                  </h2>
                  <p className="text-white/70 max-w-xl mx-auto text-sm md:text-base">
                    Get skincare tips, exclusive offers, and new treatment updates delivered to your inbox.
                  </p>
                  
                  {/* Decorative curve */}
                  <div className="flex justify-center mt-6">
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
                </div>
                
                {/* Form - Full width */}
                <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        required
                        className="w-full pl-12 pr-4 py-4 rounded-xl border-0 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 shadow-lg"
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
                  </div>
                  
                  <p className="text-center text-xs text-white/50 mt-4">
                    No spam, ever. Unsubscribe anytime.
                  </p>
                </form>
                
                {/* Benefits */}
                <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
                  {['Weekly tips', 'Exclusive offers', 'Early access'].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-white/80">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
