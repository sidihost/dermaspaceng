'use client'

import { useState } from 'react'
import { Mail, Check, ArrowRight, Sparkles } from 'lucide-react'

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
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-[#7B2D8E] rounded-xl p-6 md:p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-[#7B2D8E]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">You&apos;re Subscribed!</h3>
            <p className="text-sm text-white/80 max-w-md mx-auto">
              Welcome to Dermaspace. Check your inbox for skincare tips and exclusive offers.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-[#7B2D8E] rounded-xl overflow-hidden">
          <div className="grid md:grid-cols-2 items-center">
            {/* Left - Image */}
            <div className="relative h-48 md:h-full min-h-[200px]">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg"
                alt="Dermaspace Spa"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#7B2D8E]/80 md:to-[#7B2D8E]" />
              
              {/* Floating badge */}
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7B2D8E]" />
                <span className="text-xs font-semibold text-[#7B2D8E]">Beauty Tips</span>
              </div>
            </div>
            
            {/* Right - Content */}
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">Newsletter</span>
              </div>
              
              <h2 className="text-lg md:text-xl font-bold text-white mb-2">
                Join Our Beauty Community
              </h2>
              <p className="text-sm text-white/80 mb-5">
                Get skincare tips, exclusive offers, and be first to know about new treatments.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border-0 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#7B2D8E] text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#7B2D8E]/30 border-t-[#7B2D8E] rounded-full animate-spin" />
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
              
              <p className="text-xs text-white/60 mt-3">
                No spam, ever. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
