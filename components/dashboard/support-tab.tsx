'use client'

import { useState, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { Send, Phone, Mail, MessageSquare, Check } from 'lucide-react'
import { useFeatureFlag } from '@/lib/use-feature-flag'

// WhatsApp SVG Icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

interface User {
  firstName: string
  lastName: string
  email: string
  phone?: string
}

interface SupportTabProps {
  user: User | null
}

export default function SupportTab({ user }: SupportTabProps) {
  const captchaRef = useRef<HCaptcha>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  // Admin-controlled WhatsApp/live-agent kill switch. When OFF we
  // hide the WhatsApp tile from the quick contact row so customers
  // aren't sent to a channel we're not actively monitoring (e.g.
  // weekends, holidays, or when the social team is offline). The
  // grid quietly reflows from 3 columns to 2, no layout regression.
  const liveChatEnabled = useFeatureFlag('live_chat')

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token)
    setError('')
  }

  const handleCaptchaExpire = () => {
    setCaptchaToken(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!captchaToken) {
      setError('Please complete the captcha verification')
      return
    }

    setIsSubmitting(true)
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${user?.firstName} ${user?.lastName}`,
          email: user?.email,
          phone: user?.phone || '',
          subject,
          message,
          captchaToken
        })
      })
      
      if (res.ok) {
        setIsSubmitted(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Something went wrong. Please try again.')
        captchaRef.current?.resetCaptcha()
        setCaptchaToken(null)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
        <div className="text-center py-8">
          <div className="w-14 h-14 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-[#7B2D8E]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Sent!</h3>
          <p className="text-sm text-gray-600 mb-6">
            Thanks {user?.firstName}, we&apos;ll get back to you at {user?.email} within 24 hours.
          </p>
          <button
            onClick={() => {
              setIsSubmitted(false)
              setSubject('')
              setMessage('')
              setCaptchaToken(null)
            }}
            className="text-sm text-[#7B2D8E] font-medium hover:underline"
          >
            Send another message
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick Contact Options.
          The grid switches between 2 and 3 columns depending on
          whether `live_chat` is on, so the remaining tiles always
          fill the row instead of leaving a gap where WhatsApp used
          to be. */}
      <div
        className={`grid grid-cols-1 ${liveChatEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}
      >
        {liveChatEnabled && (
          <a
            href="https://wa.me/+2349017972919"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/20 transition-colors"
          >
            <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center">
              <WhatsAppIcon className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">WhatsApp</p>
              <p className="text-xs text-gray-500">Chat with us</p>
            </div>
          </a>
        )}
        <a
          href="tel:+2349017972919"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/20 transition-colors"
        >
          <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center">
            <Phone className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Call Us</p>
            <p className="text-xs text-gray-500">+234 901 797 2919</p>
          </div>
        </a>
        <a
          href="mailto:info@dermaspaceng.com"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/20 transition-colors"
        >
          <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Email</p>
            <p className="text-xs text-gray-500">info@dermaspaceng.com</p>
          </div>
        </a>
      </div>

      {/* Contact Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Send Us a Message</h2>
            <p className="text-xs text-gray-500">We&apos;ll respond within 24 hours</p>
          </div>
        </div>

        {/* User Info Display */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
          <div className="w-9 h-9 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-sm font-medium">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all"
            >
              <option value="">Select a subject</option>
              <option value="booking">Booking Inquiry</option>
              <option value="treatment">Treatment Questions</option>
              <option value="account">Account Help</option>
              <option value="feedback">Feedback</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Message
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none"
              placeholder="How can we help you?"
            />
          </div>

          {/* hCaptcha */}
          <div className="flex justify-center overflow-x-auto">
            <HCaptcha
              ref={captchaRef}
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001"}
              onVerify={handleCaptchaVerify}
              onExpire={handleCaptchaExpire}
              theme="light"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !captchaToken}
            className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-lg hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Message
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
