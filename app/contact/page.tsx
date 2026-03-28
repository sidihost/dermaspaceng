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
      <main className="min-h-screen bg-[#FDFBF9]">
        {/* Hero Section */}
        <section className="relative pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 bg-gradient-to-b from-[#7B2D8E]/5 to-transparent">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 bg-[#7B2D8E] rounded-full text-xs font-semibold text-white mb-4">
              Get In Touch
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
              We&apos;d Love to <span className="text-[#7B2D8E]">Hear From You</span>
            </h1>
            <p className="text-gray-600 max-w-xl mx-auto text-base sm:text-lg">
              Have questions about our treatments or ready to book? Our team is here to help you on your wellness journey.
            </p>
          </div>
        </section>

        {/* Quick Contact Cards */}
        <section className="px-4 -mt-2 mb-8 sm:mb-12">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <a
                href="tel:+2349017972919"
                className="group flex items-center gap-4 p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#7B2D8E]/20 transition-all"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center group-hover:bg-[#7B2D8E] transition-colors flex-shrink-0">
                  <Phone className="w-5 h-5 text-[#7B2D8E] group-hover:text-white transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">Call Us</p>
                  <p className="font-semibold text-gray-900 truncate">+234 901 797 2919</p>
                </div>
              </a>

              <a
                href="https://wa.me/+2349017972919"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#7B2D8E]/20 transition-all"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center group-hover:bg-[#7B2D8E] transition-colors flex-shrink-0">
                  <WhatsAppIcon className="w-5 h-5 text-[#7B2D8E] group-hover:text-white transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">WhatsApp</p>
                  <p className="font-semibold text-gray-900">Chat With Us</p>
                </div>
              </a>

              <a
                href="mailto:info@dermaspaceng.com"
                className="group flex items-center gap-4 p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#7B2D8E]/20 transition-all"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center group-hover:bg-[#7B2D8E] transition-colors flex-shrink-0">
                  <Mail className="w-5 h-5 text-[#7B2D8E] group-hover:text-white transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">Email</p>
                  <p className="font-semibold text-gray-900 truncate">info@dermaspaceng.com</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Form & Locations */}
        <section className="py-8 sm:py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
              {/* Form */}
              <div className="lg:col-span-3 order-2 lg:order-1">
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-5 sm:p-8 shadow-sm">
                  <div className="mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Send Us a Message</h2>
                    <p className="text-gray-500 text-sm sm:text-base">Fill out the form and we&apos;ll get back to you within 24 hours.</p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name <span className="text-[#7B2D8E]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address <span className="text-[#7B2D8E]">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                          placeholder="+234 xxx xxx xxxx"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all bg-white"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message <span className="text-[#7B2D8E]">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none"
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
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !captchaToken}
                      className="w-full py-3.5 sm:py-4 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#6B2280] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
              <div className="lg:col-span-2 space-y-4 sm:space-y-5 order-1 lg:order-2">
                {/* VI Location */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm group">
                  <div className="h-32 sm:h-36 relative overflow-hidden">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg"
                      alt="Victoria Island"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <span className="px-3 py-1 bg-[#7B2D8E] rounded-full text-xs font-bold text-white">Victoria Island</span>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <MapPin className="w-4 h-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600">237B Muri Okunola Street, Victoria Island, Lagos</p>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <Phone className="w-4 h-4 text-[#7B2D8E]" />
                      <p className="text-sm text-gray-600">+234 906 183 6625</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      <Link
                        href="https://wa.me/+2349061836625"
                        target="_blank"
                        className="flex-1 py-2.5 text-center text-xs sm:text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                        Chat
                      </Link>
                      <Link
                        href="https://maps.google.com/maps?q=6.4281,3.4219"
                        target="_blank"
                        className="flex-1 py-2.5 text-center text-xs sm:text-sm font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-xl hover:bg-[#7B2D8E]/20 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MapPin className="w-4 h-4" />
                        Directions
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Ikoyi Location */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm group">
                  <div className="h-32 sm:h-36 relative overflow-hidden">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg"
                      alt="Ikoyi"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <span className="px-3 py-1 bg-[#7B2D8E] rounded-full text-xs font-bold text-white">Ikoyi</span>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <MapPin className="w-4 h-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600">44A, Awolowo Road, Ikoyi, Lagos</p>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <Phone className="w-4 h-4 text-[#7B2D8E]" />
                      <p className="text-sm text-gray-600">+234 901 313 4945</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      <Link
                        href="https://wa.me/+2349013134945"
                        target="_blank"
                        className="flex-1 py-2.5 text-center text-xs sm:text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                        Chat
                      </Link>
                      <Link
                        href="https://maps.google.com/maps?q=6.4461,3.4384"
                        target="_blank"
                        className="flex-1 py-2.5 text-center text-xs sm:text-sm font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-xl hover:bg-[#7B2D8E]/20 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MapPin className="w-4 h-4" />
                        Directions
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div className="bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] rounded-2xl p-5 sm:p-6 text-white">
                  <div className="flex items-center gap-3 mb-4 sm:mb-5">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg">Opening Hours</span>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/80 text-sm">Monday - Friday</span>
                      <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs sm:text-sm font-semibold">9AM - 7PM</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/80 text-sm">Saturday</span>
                      <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs sm:text-sm font-semibold">9AM - 6PM</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-white/80 text-sm">Sunday</span>
                      <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs sm:text-sm font-semibold">By Appointment</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-12 sm:py-16 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <span className="inline-block px-4 py-1.5 bg-[#7B2D8E]/10 rounded-full text-xs font-semibold text-[#7B2D8E] mb-3">
                FAQs
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
            </div>
            
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div 
                  key={index} 
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 text-sm sm:text-base pr-4">{faq.q}</span>
                    <ChevronDown 
                      className={`w-5 h-5 text-[#7B2D8E] flex-shrink-0 transition-transform duration-200 ${
                        openFaq === index ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-200 ${
                      openFaq === index ? 'max-h-40' : 'max-h-0'
                    }`}
                  >
                    <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-gray-600 text-sm sm:text-base">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
