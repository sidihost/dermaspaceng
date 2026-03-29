"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import HCaptcha from "@hcaptcha/react-hcaptcha"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Phone, Mail, MapPin, Clock, Send, ChevronDown } from "lucide-react"

// WhatsApp SVG Icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

const faqs = [
  {
    q: "How do I book an appointment?",
    a: "You can book an appointment through our website's booking page, call us directly, or send a WhatsApp message. We'll confirm your appointment within a few hours."
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept cash, bank transfers, debit/credit cards, and mobile payments. Payment is due at the time of service."
  },
  {
    q: "Do you offer home services?",
    a: "Yes! We offer home services for select treatments. Please contact us for availability and pricing in your area."
  },
  {
    q: "What is your cancellation policy?",
    a: "We require at least 24 hours notice for cancellations. Late cancellations may incur a fee of 50% of the service cost."
  }
]

export default function ContactPage() {
  const router = useRouter()
  const captchaRef = useRef<HCaptcha>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token)
    setError("")
  }

  const handleCaptchaExpire = () => {
    setCaptchaToken(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!captchaToken) {
      setError("Please complete the captcha verification")
      return
    }

    setIsSubmitting(true)
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, captchaToken })
      })
      
      if (res.ok) {
        router.push('/contact/success')
      } else {
        const data = await res.json()
        setError(data.error || "Something went wrong. Please try again.")
        captchaRef.current?.resetCaptcha()
        setCaptchaToken(null)
      }
    } catch {
      setError("Something went wrong. Please try again.")
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Hero Section with Curve */}
        <section className="relative overflow-hidden">
          <div className="bg-gradient-to-br from-[#7B2D8E] via-[#8B3D9E] to-[#5A1D6A] pt-28 sm:pt-32 pb-20 sm:pb-24 px-4">
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold text-white/90 uppercase tracking-widest mb-4">
                Get In Touch
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4 text-balance">
                We&apos;d Love to Hear From You
              </h1>
              {/* Decorative curve */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <svg width="50" height="8" viewBox="0 0 50 8" fill="none" className="w-10 md:w-12">
                  <path d="M1 6C12 2 38 2 49 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
                </svg>
                <div className="w-2 h-2 bg-white/60 rounded-full" />
                <svg width="50" height="8" viewBox="0 0 50 8" fill="none" className="w-10 md:w-12">
                  <path d="M1 6C12 2 38 2 49 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
                </svg>
              </div>
              <p className="text-white/80 max-w-xl mx-auto text-sm sm:text-base md:text-lg">
                Have questions about our treatments or ready to book? Our team is here to help you on your wellness journey.
              </p>
            </div>
          </div>
          {/* Bottom curve */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
            <svg className="relative block w-full h-12 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="#fff"></path>
            </svg>
          </div>
        </section>

        {/* Quick Contact Cards */}
        <section className="px-4 sm:px-6 -mt-6 sm:-mt-8 mb-10 sm:mb-14 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a
                href="tel:+2349017972919"
                className="group flex items-center gap-4 p-5 sm:p-6 bg-white rounded-2xl border-2 border-[#7B2D8E]/10 shadow-lg shadow-[#7B2D8E]/5 hover:shadow-xl hover:border-[#7B2D8E]/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#7B2D8E] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#7B2D8E] font-medium mb-0.5">Call Us</p>
                  <p className="font-bold text-foreground truncate">+234 901 797 2919</p>
                </div>
              </a>

              <a
                href="https://wa.me/+2349017972919"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-5 sm:p-6 bg-white rounded-2xl border-2 border-[#7B2D8E]/10 shadow-lg shadow-[#7B2D8E]/5 hover:shadow-xl hover:border-[#7B2D8E]/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#7B2D8E] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <WhatsAppIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#7B2D8E] font-medium mb-0.5">WhatsApp</p>
                  <p className="font-bold text-foreground">Chat With Us</p>
                </div>
              </a>

              <a
                href="mailto:info@dermaspaceng.com"
                className="group flex items-center gap-4 p-5 sm:p-6 bg-white rounded-2xl border-2 border-[#7B2D8E]/10 shadow-lg shadow-[#7B2D8E]/5 hover:shadow-xl hover:border-[#7B2D8E]/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#7B2D8E] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#7B2D8E] font-medium mb-0.5">Email</p>
                  <p className="font-bold text-foreground truncate">info@dermaspaceng.com</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Form & Locations */}
        <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
              {/* Form */}
              <div className="lg:col-span-3 order-2 lg:order-1">
                <div className="bg-white rounded-3xl border-2 border-[#7B2D8E]/10 p-6 sm:p-8 shadow-lg shadow-[#7B2D8E]/5 relative overflow-hidden">
                  {/* Top accent curve */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#7B2D8E] via-[#9B4DB0] to-[#7B2D8E]" />
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#7B2D8E]/5 rounded-full blur-2xl" />
                  
                  <div className="mb-6 sm:mb-8 relative">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Send Us a Message</h2>
                    {/* Underline accent */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="w-12 h-1 bg-[#7B2D8E] rounded-full" />
                      <div className="w-2 h-2 bg-[#7B2D8E]/50 rounded-full" />
                    </div>
                    <p className="text-muted-foreground text-sm sm:text-base">Fill out the form and we&apos;ll get back to you within 24 hours.</p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 relative">
                    <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Full Name <span className="text-[#7B2D8E]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3.5 text-sm rounded-xl border-2 border-[#7B2D8E]/10 bg-[#7B2D8E]/[0.02] focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Email Address <span className="text-[#7B2D8E]">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3.5 text-sm rounded-xl border-2 border-[#7B2D8E]/10 bg-[#7B2D8E]/[0.02] focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3.5 text-sm rounded-xl border-2 border-[#7B2D8E]/10 bg-[#7B2D8E]/[0.02] focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="+234 xxx xxx xxxx"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Subject
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-4 py-3.5 text-sm rounded-xl border-2 border-[#7B2D8E]/10 bg-[#7B2D8E]/[0.02] focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all text-foreground"
                        >
                          <option value="">Select a subject</option>
                          <option value="booking">Book Appointment</option>
                          <option value="inquiry">General Inquiry</option>
                          <option value="membership">Membership Info</option>
                          <option value="feedback">Feedback</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Message <span className="text-[#7B2D8E]">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3.5 text-sm rounded-xl border-2 border-[#7B2D8E]/10 bg-[#7B2D8E]/[0.02] focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none text-foreground placeholder:text-muted-foreground"
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
                      <div className="p-4 bg-red-50 border-2 border-red-100 rounded-xl text-sm text-red-600 font-medium">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !captchaToken}
                      className="w-full py-4 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#6B2280] hover:shadow-lg hover:shadow-[#7B2D8E]/20 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-2 space-y-5 order-1 lg:order-2">
                {/* VI Location */}
                <div className="bg-white rounded-2xl border-2 border-[#7B2D8E]/10 overflow-hidden shadow-lg shadow-[#7B2D8E]/5 group">
                  <div className="h-36 sm:h-40 relative overflow-hidden">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg"
                      alt="Victoria Island"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/80 via-[#7B2D8E]/20 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <span className="px-4 py-1.5 bg-white rounded-full text-xs font-bold text-[#7B2D8E]">Victoria Island</span>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                      </div>
                      <p className="text-sm text-muted-foreground">237B Muri Okunola Street, Victoria Island, Lagos</p>
                    </div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-[#7B2D8E]" />
                      </div>
                      <p className="text-sm text-muted-foreground">+234 906 183 6625</p>
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href="https://wa.me/+2349061836625"
                        target="_blank"
                        className="flex-1 py-3 text-center text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-2"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                        Chat
                      </Link>
                      <Link
                        href="https://maps.google.com/maps?q=6.4281,3.4219"
                        target="_blank"
                        className="flex-1 py-3 text-center text-sm font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-xl hover:bg-[#7B2D8E]/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Directions
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Ikoyi Location */}
                <div className="bg-white rounded-2xl border-2 border-[#7B2D8E]/10 overflow-hidden shadow-lg shadow-[#7B2D8E]/5 group">
                  <div className="h-36 sm:h-40 relative overflow-hidden">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg"
                      alt="Ikoyi"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/80 via-[#7B2D8E]/20 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <span className="px-4 py-1.5 bg-white rounded-full text-xs font-bold text-[#7B2D8E]">Ikoyi</span>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                      </div>
                      <p className="text-sm text-muted-foreground">44A, Awolowo Road, Ikoyi, Lagos</p>
                    </div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-[#7B2D8E]" />
                      </div>
                      <p className="text-sm text-muted-foreground">+234 901 313 4945</p>
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href="https://wa.me/+2349013134945"
                        target="_blank"
                        className="flex-1 py-3 text-center text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-2"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                        Chat
                      </Link>
                      <Link
                        href="https://maps.google.com/maps?q=6.4461,3.4384"
                        target="_blank"
                        className="flex-1 py-3 text-center text-sm font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-xl hover:bg-[#7B2D8E]/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Directions
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div className="bg-gradient-to-br from-[#7B2D8E] via-[#8B3D9E] to-[#5A1D6A] rounded-2xl p-6 text-white relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                  
                  <div className="flex items-center gap-3 mb-5 relative">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-lg">Opening Hours</span>
                  </div>
                  <div className="space-y-3 relative">
                    <div className="flex justify-between items-center py-2.5 border-b border-white/15">
                      <span className="text-white/80 text-sm">Monday - Friday</span>
                      <span className="px-3 py-1.5 bg-white/20 rounded-full text-sm font-semibold">9AM - 7PM</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-white/15">
                      <span className="text-white/80 text-sm">Saturday</span>
                      <span className="px-3 py-1.5 bg-white/20 rounded-full text-sm font-semibold">9AM - 6PM</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-white/80 text-sm">Sunday</span>
                      <span className="px-3 py-1.5 bg-white/20 rounded-full text-sm font-semibold">By Appointment</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section with Curve */}
        <section className="relative overflow-hidden">
          {/* Top curve */}
          <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
            <svg className="relative block w-full h-12 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="#fff" fillOpacity="1"></path>
            </svg>
          </div>
          
          <div id="faq" className="py-16 sm:py-20 pt-24 sm:pt-28 px-4 bg-[#7B2D8E]/[0.03]">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10 sm:mb-12">
                <span className="inline-block px-4 py-1.5 bg-[#7B2D8E] rounded-full text-xs font-semibold text-white uppercase tracking-widest mb-4">
                  FAQs
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
                {/* Decorative curve */}
                <div className="flex items-center justify-center gap-2">
                  <svg width="50" height="8" viewBox="0 0 50 8" fill="none" className="w-10 md:w-12">
                    <path d="M1 6C12 2 38 2 49 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
                  </svg>
                  <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
                  <svg width="50" height="8" viewBox="0 0 50 8" fill="none" className="w-10 md:w-12">
                    <path d="M1 6C12 2 38 2 49 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
                  </svg>
                </div>
              </div>
              
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div 
                    key={index} 
                    className="bg-white border-2 border-[#7B2D8E]/10 rounded-2xl overflow-hidden shadow-lg shadow-[#7B2D8E]/5"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-5 sm:p-6 text-left bg-white hover:bg-[#7B2D8E]/[0.02] transition-colors"
                    >
                      <span className="font-semibold text-foreground text-sm sm:text-base pr-4">{faq.q}</span>
                      <div className={`w-8 h-8 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${openFaq === index ? 'bg-[#7B2D8E]' : ''}`}>
                        <ChevronDown 
                          className={`w-4 h-4 transition-all duration-300 ${
                            openFaq === index ? 'rotate-180 text-white' : 'text-[#7B2D8E]'
                          }`} 
                        />
                      </div>
                    </button>
                    <div 
                      className={`overflow-hidden transition-all duration-300 ${
                        openFaq === index ? 'max-h-40' : 'max-h-0'
                      }`}
                    >
                      <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-muted-foreground text-sm sm:text-base">{faq.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
