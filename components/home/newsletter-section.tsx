'use client'

import { useState } from 'react'
import { Mail, Check, ArrowRight } from 'lucide-react'

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
        <div className="bg-[#7B2D8E] rounded-xl p-6 md:p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-5 h-5 text-white" />
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
    </section>
  )
}
