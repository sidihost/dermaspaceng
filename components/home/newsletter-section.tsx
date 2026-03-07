'use client'

import { useState } from 'react'
import { Mail, ArrowRight, Check } from 'lucide-react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  return (
    <section className="relative py-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#7B2D8E]" />
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#D4A853]/10 rounded-full translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-[#D4A853] rounded-full" />
      <div className="absolute bottom-1/3 left-1/4 w-3 h-3 bg-white/20 rounded-full" />

      <div className="relative max-w-4xl mx-auto px-4">
        {isSubmitted ? (
          /* Success State */
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">You're Subscribed!</h3>
            <p className="text-white/80 text-sm">
              Welcome to the Dermaspace family. You'll hear from us soon.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
                <span className="text-xs font-medium text-[#D4A853] uppercase tracking-widest">Newsletter</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Subscribe to Our <span className="text-[#D4A853]">Newsletter</span>
              </h2>
              <p className="text-sm text-white/70 max-w-md mx-auto">
                Stay updated with skincare tips, new treatments, and wellness advice from our experts
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-full bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A853] shadow-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#D4A853] text-white text-sm font-semibold rounded-full hover:bg-[#C49843] transition-colors disabled:opacity-70 shadow-lg"
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
                No spam, unsubscribe anytime. By subscribing you agree to our Privacy Policy.
              </p>
            </form>

            {/* Decorative line */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <div className="w-8 h-0.5 bg-[#D4A853]/50" />
              <div className="w-2 h-2 rounded-full bg-[#D4A853]" />
              <div className="w-8 h-0.5 bg-[#D4A853]/50" />
            </div>
          </>
        )}
      </div>
    </section>
  )
}
