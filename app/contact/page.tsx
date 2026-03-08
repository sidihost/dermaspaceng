"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Phone, Mail, MapPin, Clock, Send, ArrowRight } from "lucide-react"

// WhatsApp SVG Icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        router.push('/contact/success')
      } else {
        alert("Something went wrong. Please try again.")
      }
    } catch {
      alert("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FDFBF9]">
        {/* Hero Section */}
        <section className="pt-24 pb-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              {/* Text Content */}
              <div>
                <span className="inline-block px-3 py-1 bg-[#7B2D8E]/10 rounded-full text-xs font-medium text-[#7B2D8E] mb-4">
                  Contact Us
                </span>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
                  Get In Touch With Us
                </h1>
                <p className="text-gray-600 mb-6">
                  Have questions about our treatments or ready to book? We&apos;re here to help.
                </p>

                {/* Quick Contact */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="tel:+2349017972919"
                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-[#7B2D8E]/30 transition-colors"
                  >
                    <div className="w-9 h-9 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Call Us</p>
                      <p className="text-sm font-medium text-gray-900">+234 901 797 2919</p>
                    </div>
                  </a>

                  <a
                    href="https://wa.me/+2349017972919"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-green-300 transition-colors"
                  >
                    <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                      <WhatsAppIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">WhatsApp</p>
                      <p className="text-sm font-medium text-gray-900">Chat with us</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Image */}
              <div className="relative hidden lg:block">
                <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="aspect-[4/3]">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg"
                      alt="Dermaspace Reception"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                {/* Email Badge */}
                <div className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#7B2D8E]" />
                    <span className="text-xs font-medium text-gray-700">info@dermaspaceng.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form & Locations */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Form */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Send Us a Message</h2>
                  <p className="text-sm text-gray-500 mb-5">Fill out the form and we&apos;ll get back to you soon.</p>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                          placeholder="+234 xxx xxx xxxx"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Subject
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all bg-white"
                        >
                          <option value="">Select subject</option>
                          <option value="booking">Book Appointment</option>
                          <option value="inquiry">General Inquiry</option>
                          <option value="membership">Membership Info</option>
                          <option value="feedback">Feedback</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Message *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none"
                        placeholder="How can we help you?"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#6B2280] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
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

              {/* Sidebar */}
              <div className="lg:col-span-2 space-y-4">
                {/* VI Location */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="h-28 relative">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg"
                      alt="Victoria Island"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-white rounded text-xs font-bold text-[#7B2D8E]">VI</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm text-gray-900 mb-0.5">Victoria Island</h3>
                    <p className="text-xs text-gray-500 mb-3">237B Muri Okunola Street, VI</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <Phone className="w-3 h-3 text-[#7B2D8E]" />
                      <span>+234 906 183 6625</span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href="https://wa.me/+2349061836625"
                        target="_blank"
                        className="flex-1 py-1.5 text-center text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <WhatsAppIcon className="w-3 h-3" />
                        WhatsApp
                      </Link>
                      <Link
                        href="https://maps.google.com/maps?q=6.4281,3.4219"
                        target="_blank"
                        className="flex-1 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        Directions
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Ikoyi Location */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="h-28 relative">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg"
                      alt="Ikoyi"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-white rounded text-xs font-bold text-[#7B2D8E]">IKY</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm text-gray-900 mb-0.5">Ikoyi</h3>
                    <p className="text-xs text-gray-500 mb-3">44A, Awolowo Road, Ikoyi</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <Phone className="w-3 h-3 text-[#7B2D8E]" />
                      <span>+234 901 313 4945</span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href="https://wa.me/+2349013134945"
                        target="_blank"
                        className="flex-1 py-1.5 text-center text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <WhatsAppIcon className="w-3 h-3" />
                        WhatsApp
                      </Link>
                      <Link
                        href="https://maps.google.com/maps?q=6.4461,3.4384"
                        target="_blank"
                        className="flex-1 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        Directions
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div className="bg-[#7B2D8E] rounded-xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm">Opening Hours</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Mon - Sat</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded-full font-medium">9AM - 7PM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Sunday</span>
                      <span className="px-2 py-0.5 bg-white/10 rounded-full">Closed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-10 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#7B2D8E] rounded-xl p-6 md:p-8 text-center">
              <h2 className="text-lg md:text-xl font-bold text-white mb-2">
                Ready to Transform Your Skin?
              </h2>
              <p className="text-white/80 text-sm mb-4">
                Book your appointment today.
              </p>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-5 py-2 bg-white text-[#7B2D8E] text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Book Appointment
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
