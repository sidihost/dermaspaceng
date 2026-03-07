"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Phone, Mail, MapPin, Clock, Send, MessageCircle, ArrowRight, Sparkles, Heart } from "lucide-react"

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
        {/* Hero Section with Image */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          {/* Decorative dots */}
          <div className="absolute top-32 left-8 w-2 h-2 bg-[#7B2D8E] rounded-full opacity-60" />
          <div className="absolute top-48 right-16 w-3 h-3 bg-[#7B2D8E]/30 rounded-full" />
          <div className="absolute bottom-24 left-1/4 w-2 h-2 bg-[#7B2D8E]/40 rounded-full" />

          <div className="max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 mb-6">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#7B2D8E]">
                    <Heart className="w-3 h-3 text-white" />
                  </span>
                  <span className="text-sm font-medium text-gray-700">We&apos;d Love to Hear From You</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-5">
                  Let&apos;s Start Your{' '}
                  <span className="relative inline-block text-[#7B2D8E]">
                    Wellness Journey
                    <svg 
                      className="absolute -bottom-2 left-0 w-full" 
                      viewBox="0 0 200 12" 
                      fill="none"
                    >
                      <path 
                        d="M2 8C50 2 150 2 198 8" 
                        stroke="#7B2D8E" 
                        strokeWidth="3" 
                        strokeLinecap="round"
                        strokeOpacity="0.4"
                      />
                    </svg>
                  </span>
                </h1>

                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  Have questions about our treatments or ready to book your appointment? 
                  Our friendly team is here to help you every step of the way.
                </p>

                {/* Quick Contact Cards */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <a
                    href="tel:+2349017972919"
                    className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-lg transition-all"
                  >
                    <div className="w-12 h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center group-hover:bg-[#7B2D8E] transition-colors">
                      <Phone className="w-5 h-5 text-[#7B2D8E] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Call Us</p>
                      <p className="text-sm text-gray-500">+234 901 797 2919</p>
                    </div>
                  </a>

                  <a
                    href="https://wa.me/+2349017972919"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-lg transition-all"
                  >
                    <div className="w-12 h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center group-hover:bg-[#7B2D8E] transition-colors">
                      <MessageCircle className="w-5 h-5 text-[#7B2D8E] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">WhatsApp</p>
                      <p className="text-sm text-gray-500">Chat with us</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Image Card */}
              <div className="relative">
                {/* Purple accent line */}
                <div className="absolute -left-3 top-8 bottom-8 w-1.5 bg-[#7B2D8E] rounded-full hidden lg:block" />
                
                <div className="relative ml-0 lg:ml-4">
                  <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="aspect-[4/3]">
                      <img
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg"
                        alt="Dermaspace Reception"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Floating Response Time Badge */}
                  <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E] flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Quick Response</p>
                        <p className="text-xs text-gray-500">Within 24 hours</p>
                      </div>
                    </div>
                  </div>

                  {/* Email Badge */}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#7B2D8E]" />
                      <span className="text-sm font-medium text-gray-700">info@dermaspaceng.com</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form & Locations Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 bg-[#7B2D8E]/10 rounded-full text-sm font-medium text-[#7B2D8E] mb-4">
                Get In Touch
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Send Us a Message
              </h2>
              <p className="text-gray-600 max-w-lg mx-auto">
                Fill out the form below and we&apos;ll get back to you as soon as possible.
              </p>
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
              {/* Contact Form */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all"
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
                          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all bg-white"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none"
                        placeholder="How can we help you?"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#6B2280] transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-[#7B2D8E]/25 hover:shadow-xl hover:shadow-[#7B2D8E]/30"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

              {/* Sidebar - Locations & Hours */}
              <div className="lg:col-span-2 space-y-5">
                {/* Victoria Island */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-32 relative">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg"
                      alt="Victoria Island Location"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 px-3 py-1 bg-white rounded-full text-xs font-bold text-[#7B2D8E]">
                      VI
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 mb-1">Victoria Island</h3>
                    <p className="text-sm text-gray-500 mb-4">237B Muri Okunola Street, VI, Lagos</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-[#7B2D8E]" />
                        <span>+234 906 183 6625</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-[#7B2D8E]" />
                        <span>Mon - Sat: 9AM - 7PM</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Link
                        href="https://wa.me/+2349061836625"
                        target="_blank"
                        className="flex-1 py-2.5 text-center text-sm font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-lg hover:bg-[#7B2D8E]/20 transition-colors"
                      >
                        WhatsApp
                      </Link>
                      <Link
                        href="https://maps.google.com/maps?q=6.4281,3.4219"
                        target="_blank"
                        className="flex-1 py-2.5 text-center text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Directions
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Ikoyi */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-32 relative">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg"
                      alt="Ikoyi Location"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 px-3 py-1 bg-white rounded-full text-xs font-bold text-[#7B2D8E]">
                      IKY
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 mb-1">Ikoyi</h3>
                    <p className="text-sm text-gray-500 mb-4">44A, Awolowo Road, Ikoyi, Lagos</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-[#7B2D8E]" />
                        <span>+234 901 313 4945</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-[#7B2D8E]" />
                        <span>Mon - Sat: 9AM - 7PM</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Link
                        href="https://wa.me/+2349013134945"
                        target="_blank"
                        className="flex-1 py-2.5 text-center text-sm font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-lg hover:bg-[#7B2D8E]/20 transition-colors"
                      >
                        WhatsApp
                      </Link>
                      <Link
                        href="https://maps.google.com/maps?q=6.4461,3.4384"
                        target="_blank"
                        className="flex-1 py-2.5 text-center text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Directions
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Opening Hours */}
                <div className="bg-[#7B2D8E] rounded-2xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg">Opening Hours</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Monday - Friday</span>
                      <span className="font-medium">9:00 AM - 7:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Saturday</span>
                      <span className="font-medium">9:00 AM - 7:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Sunday</span>
                      <span className="font-medium">Closed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-100 p-8 md:p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#7B2D8E]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-[#7B2D8E]" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Ready to Transform Your Skin?
              </h2>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                Book your appointment today and experience the best skincare treatments in Lagos.
              </p>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#7B2D8E] text-white font-semibold rounded-full hover:bg-[#6B2280] transition-all shadow-lg shadow-[#7B2D8E]/25 hover:shadow-xl hover:shadow-[#7B2D8E]/30"
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
