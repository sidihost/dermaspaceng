"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from "lucide-react"

export default function ContactPage() {
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
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    alert("Thank you for your message! We will get back to you soon.")
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" })
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FDFBF9]">
        {/* Hero Section */}
        <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4A853]/10 rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-8 w-2 h-2 bg-[#D4A853] rounded-full hidden md:block" />
          <div className="absolute bottom-1/3 right-12 w-3 h-3 bg-white/20 rounded-full hidden md:block" />
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-[#D4A853] uppercase tracking-widest">Get In Touch</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Contact <span className="text-[#D4A853]">Us</span>
            </h1>
            <p className="text-sm md:text-base text-white/80">
              For further enquiries and discussions, reach us via the following
            </p>
            
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="w-8 h-0.5 bg-[#D4A853]/50" />
              <div className="w-2 h-2 rounded-full bg-[#D4A853]" />
              <div className="w-8 h-0.5 bg-[#D4A853]/50" />
            </div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-10 -mt-6 relative z-20">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-100 text-center hover:border-[#7B2D8E]/30 transition-colors">
                <div className="w-11 h-11 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Phone</h3>
                <p className="text-sm text-gray-600">09017972919 (Franca)</p>
                <p className="text-sm text-gray-600">08071584418 (Itunu)</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 text-center hover:border-[#7B2D8E]/30 transition-colors">
                <div className="w-11 h-11 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Email</h3>
                <p className="text-sm text-gray-600">info@dermaspaceng.com</p>
                <p className="text-sm text-gray-600">admin@dermaspaceng.com</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 text-center hover:border-[#7B2D8E]/30 transition-colors">
                <div className="w-11 h-11 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Locations</h3>
                <p className="text-sm text-gray-600">Victoria Island</p>
                <p className="text-sm text-gray-600">Ikoyi, Lagos</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 text-center hover:border-[#7B2D8E]/30 transition-colors">
                <div className="w-11 h-11 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Hours</h3>
                <p className="text-sm text-gray-600">Mon - Sat: 9AM - 7PM</p>
                <p className="text-sm text-gray-600">Sunday: 10AM - 5PM</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-10">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-5 gap-8">
              {/* Contact Form */}
              <div className="lg:col-span-3 bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Send Us a Message</h2>
                <p className="text-sm text-gray-500 mb-6">We will get back to you within 24 hours</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
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
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                        placeholder="+234..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject</label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all"
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
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Message</label>
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
                    className="w-full py-3 px-4 bg-[#7B2D8E] text-white text-sm font-semibold rounded-lg hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
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

              {/* WhatsApp & Social */}
              <div className="lg:col-span-2 space-y-6">
                {/* WhatsApp */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    WhatsApp Us
                  </h3>
                  
                  <div className="space-y-3">
                    <Link
                      href="https://wa.me/+2349013134945"
                      target="_blank"
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-green-500/50 hover:bg-green-50/50 transition-all"
                    >
                      <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">Ikoyi Branch</p>
                        <p className="text-xs text-gray-500">+234 901 313 4945</p>
                      </div>
                    </Link>

                    <Link
                      href="https://wa.me/+2349061836625"
                      target="_blank"
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-green-500/50 hover:bg-green-50/50 transition-all"
                    >
                      <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">V.I Branch</p>
                        <p className="text-xs text-gray-500">+234 906 183 6625</p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Social Media */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Follow Us</h3>
                  <div className="flex gap-3">
                    <Link
                      href="https://www.facebook.com/dermaspaceng/"
                      target="_blank"
                      className="w-10 h-10 rounded-lg bg-[#1877F2] flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </Link>
                    <Link
                      href="https://www.instagram.com/dermaspace.ng/"
                      target="_blank"
                      className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      </svg>
                    </Link>
                    <Link
                      href="https://x.com/DermaspaceN"
                      target="_blank"
                      className="w-10 h-10 rounded-lg bg-black flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Image */}
                <div className="relative rounded-2xl overflow-hidden h-40">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                    alt="Dermaspace Spa"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[#7B2D8E]/40" />
                  <div className="absolute bottom-4 left-4">
                    <p className="text-white font-semibold text-sm">Experience Luxury</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Branches Section */}
        <section id="locations" className="py-12 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-lg font-bold text-center text-gray-900 mb-8">Our Branches</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* V.I Branch */}
              <div className="bg-[#FDFBF9] rounded-xl p-6 border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Victoria Island</h3>
                    <p className="text-sm text-gray-600 mb-3">237B Muri Okunola Street, Victoria Island, Lagos 106104</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="https://wa.me/+2349061836625"
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </Link>
                      <Link
                        href="tel:+2349061836625"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7B2D8E] text-white rounded-lg text-xs font-medium hover:bg-[#5A1D6A] transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ikoyi Branch */}
              <div className="bg-[#FDFBF9] rounded-xl p-6 border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Ikoyi</h3>
                    <p className="text-sm text-gray-600 mb-3">9, Agbeke Rotinwa Close, Dolphin Extension Estate, Ikoyi, Lagos</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="https://wa.me/+2349013134945"
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </Link>
                      <Link
                        href="tel:+2349013134945"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7B2D8E] text-white rounded-lg text-xs font-medium hover:bg-[#5A1D6A] transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
