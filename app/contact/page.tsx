"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import HCaptcha from "@hcaptcha/react-hcaptcha"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Phone, Mail, MapPin, Clock, Send, ChevronDown, Navigation } from "lucide-react"

// WhatsApp SVG Icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// Location Card Component
function LocationCard({ location }: { 
  location: { 
    name: string; 
    address: string; 
    phone: string; 
    whatsapp: string;
    mapUrl: string;
  } 
}) {
  return (
    <div className="bg-white rounded-xl border border-[#7B2D8E]/10 overflow-hidden">
      {/* Google Maps Embed */}
      <div className="h-32 relative">
        <iframe
          src={location.mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Dermaspace ${location.name} Location`}
          className="grayscale hover:grayscale-0 transition-all duration-500"
        />
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
          <p className="text-xs font-bold text-[#7B2D8E]">{location.name}</p>
        </div>
      </div>
      
      {/* Details */}
      <div className="p-3">
        <div className="space-y-1.5 mb-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-3 h-3 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-tight">{location.address}</p>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-[#7B2D8E] flex-shrink-0" />
            <p className="text-xs text-muted-foreground">{location.phone}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link
            href={`https://wa.me/${location.whatsapp}`}
            target="_blank"
            className="flex-1 py-1.5 text-center text-xs font-semibold text-white bg-[#7B2D8E] rounded-md hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-1"
          >
            <WhatsAppIcon className="w-3 h-3" />
            Chat
          </Link>
          <Link
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`}
            target="_blank"
            className="flex-1 py-1.5 text-center text-xs font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-md hover:bg-[#7B2D8E]/20 transition-colors flex items-center justify-center gap-1"
          >
            <Navigation className="w-3 h-3" />
            Directions
          </Link>
        </div>
      </div>
    </div>
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
        {/* Hero Section */}
        <section className="bg-[#7B2D8E] py-12 md:py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 mb-3">
              <span className="text-xs font-medium text-white uppercase tracking-widest">Get In Touch</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              We&apos;d Love to Hear From You
            </h1>
            <p className="text-sm text-white/80 max-w-md mx-auto">
              Have questions or ready to book? Our team is here to help.
            </p>
          </div>
        </section>

        {/* Quick Contact Cards */}
        <section className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Call */}
              <a
                href="tel:+2349017972919"
                className="group relative p-5 bg-white rounded-2xl border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/20 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#7B2D8E]/5 rounded-bl-[40px] group-hover:bg-[#7B2D8E]/10 transition-colors" />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#7B2D8E] rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[#7B2D8E] font-semibold uppercase tracking-wide mb-0.5">Call Us</p>
                    <p className="text-sm font-bold text-foreground">+234 901 797 2919</p>
                    {/* Curved underline */}
                    <svg className="w-20 h-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 80 8" fill="none">
                      <path d="M2 6C20 2 60 2 78 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
                    </svg>
                  </div>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/+2349017972919"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-5 bg-white rounded-2xl border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/20 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#7B2D8E]/5 rounded-bl-[40px] group-hover:bg-[#7B2D8E]/10 transition-colors" />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#7B2D8E] rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <WhatsAppIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[#7B2D8E] font-semibold uppercase tracking-wide mb-0.5">WhatsApp</p>
                    <p className="text-sm font-bold text-foreground">Chat With Us</p>
                    {/* Curved underline */}
                    <svg className="w-16 h-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 64 8" fill="none">
                      <path d="M2 6C16 2 48 2 62 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
                    </svg>
                  </div>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:info@dermaspaceng.com"
                className="group relative p-5 bg-white rounded-2xl border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/20 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#7B2D8E]/5 rounded-bl-[40px] group-hover:bg-[#7B2D8E]/10 transition-colors" />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#7B2D8E] rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[#7B2D8E] font-semibold uppercase tracking-wide mb-0.5">Email</p>
                    <p className="text-sm font-bold text-foreground truncate">info@dermaspaceng.com</p>
                    {/* Curved underline */}
                    <svg className="w-24 h-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 96 8" fill="none">
                      <path d="M2 6C24 2 72 2 94 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
                    </svg>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Form & Map Section */}
        <section className="py-8 md:py-10 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Form */}
              <div className="lg:col-span-3 order-2 lg:order-1">
                <div className="bg-white rounded-2xl border border-[#7B2D8E]/10 p-5 sm:p-6 relative overflow-hidden">
                  {/* Top accent */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#7B2D8E]" />
                  
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-foreground mb-1">Send Us a Message</h2>
                    <p className="text-muted-foreground text-sm">Fill out the form and we&apos;ll get back to you within 24 hours.</p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">
                          Full Name <span className="text-[#7B2D8E]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#7B2D8E]/10 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">
                          Email Address <span className="text-[#7B2D8E]">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#7B2D8E]/10 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#7B2D8E]/10 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="+234 xxx xxx xxxx"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">
                          Subject
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#7B2D8E]/10 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all text-foreground"
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
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Message <span className="text-[#7B2D8E]">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#7B2D8E]/10 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none text-foreground placeholder:text-muted-foreground"
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
                      className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-lg hover:bg-[#6B2280] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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

              {/* Sidebar with Locations and Hours */}
              <div className="lg:col-span-2 space-y-3 order-1 lg:order-2">
                {/* Victoria Island */}
                <LocationCard 
                  location={{
                    name: 'Victoria Island',
                    address: '237B Muri Okunola Street, VI, Lagos',
                    phone: '+234 906 183 6625',
                    whatsapp: '+2349061836625',
                    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.7273!2d3.4219!3d6.4281!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103bf53aec4dd92d%3A0x5e34ff9a25fd9285!2sVictoria%20Island%2C%20Lagos!5e0!3m2!1sen!2sng!4v1'
                  }}
                />
                
                {/* Ikoyi */}
                <LocationCard 
                  location={{
                    name: 'Ikoyi',
                    address: '44A, Awolowo Road, Ikoyi, Lagos',
                    phone: '+234 901 313 4945',
                    whatsapp: '+2349013134945',
                    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.5!2d3.4384!3d6.4461!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103bf4cc9b07cf55%3A0x5206f6ad3b94a3e!2sIkoyi%2C%20Lagos!5e0!3m2!1sen!2sng!4v1'
                  }}
                />

                {/* Hours Card */}
                <div className="bg-[#7B2D8E] rounded-xl p-3 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center">
                      <Clock className="w-3 h-3" />
                    </div>
                    <span className="font-bold text-sm">Opening Hours</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                      <span className="text-white/80 text-xs">Monday - Friday</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">9AM - 7PM</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                      <span className="text-white/80 text-xs">Saturday</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">9AM - 6PM</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-white/80 text-xs">Sunday</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">By Appointment</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-8 md:py-10 px-4 bg-[#7B2D8E]/[0.03]">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
                <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">FAQs</span>
              </div>
              <h2 className="text-lg font-bold text-foreground">Frequently Asked Questions</h2>
            </div>
            
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div 
                  key={index} 
                  className="bg-white border border-[#7B2D8E]/10 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-[#7B2D8E]/[0.02] transition-colors"
                  >
                    <span className="font-semibold text-foreground text-sm pr-4">{faq.q}</span>
                    <div className={`w-6 h-6 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${openFaq === index ? 'bg-[#7B2D8E]' : ''}`}>
                      <ChevronDown 
                        className={`w-3.5 h-3.5 transition-all ${
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
                    <p className="px-4 pb-4 text-muted-foreground text-sm">{faq.a}</p>
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
