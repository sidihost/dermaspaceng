"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Phone, Mail, MapPin, Clock, Send, ChevronRight } from "lucide-react"

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
        {/* Hero Section */}
        <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4A853]/10 rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-[#D4A853] uppercase tracking-widest">Get In Touch</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Contact <span className="text-[#D4A853]">Us</span>
            </h1>
            <p className="text-sm md:text-base text-white/80">
              We would love to hear from you. Reach out to us anytime.
            </p>
            
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="w-8 h-0.5 bg-[#D4A853]/50" />
              <div className="w-2 h-2 rounded-full bg-[#D4A853]" />
              <div className="w-8 h-0.5 bg-[#D4A853]/50" />
            </div>
          </div>
        </section>

        {/* Quick Contact Cards */}
        <section className="py-8 -mt-8 relative z-20">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-4">
                  <Phone className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Phone</h3>
                <p className="text-sm text-gray-600">+234 901 797 2919</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Email</h3>
                <p className="text-sm text-gray-600">info@dermaspaceng.com</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-4">
                  <MapPin className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Locations</h3>
                <p className="text-sm text-gray-600">V.I & Ikoyi, Lagos</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Hours</h3>
                <p className="text-sm text-gray-600">Mon-Sat: 9AM-7PM</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-10">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-5 gap-8">
              {/* Contact Form */}
              <div className="lg:col-span-3 bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Send Us a Message</h2>
                <p className="text-sm text-gray-500 mb-6">We typically respond within 24 hours</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/10 outline-none transition-all"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/10 outline-none transition-all"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/10 outline-none transition-all"
                        placeholder="+234..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/10 outline-none transition-all bg-white"
                      >
                        <option value="">Select subject</option>
                        <option value="booking">Book Appointment</option>
                        <option value="inquiry">General Inquiry</option>
                        <option value="membership">Membership Info</option>
                        <option value="feedback">Feedback</option>
                        <option value="partnership">Partnership</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/10 outline-none transition-all resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
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

              {/* Right Sidebar */}
              <div className="lg:col-span-2 space-y-5">
                {/* WhatsApp Card */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#7B2D8E] flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Chat on WhatsApp</h3>
                      <p className="text-xs text-gray-500">Get quick responses</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Link
                      href="https://wa.me/+2349013134945"
                      target="_blank"
                      className="flex items-center justify-between p-4 rounded-xl bg-[#FDFBF9] border border-gray-100 hover:border-[#7B2D8E]/30 transition-all group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Ikoyi Branch</p>
                        <p className="text-xs text-gray-500">+234 901 313 4945</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
                    </Link>

                    <Link
                      href="https://wa.me/+2349061836625"
                      target="_blank"
                      className="flex items-center justify-between p-4 rounded-xl bg-[#FDFBF9] border border-gray-100 hover:border-[#7B2D8E]/30 transition-all group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">V.I Branch</p>
                        <p className="text-xs text-gray-500">+234 906 183 6625</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
                    </Link>
                  </div>
                </div>

                {/* Social Media */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 mb-4">Follow Us</h3>
                  <div className="flex gap-3">
                    <Link
                      href="https://www.instagram.com/dermaspace.ng/"
                      target="_blank"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#7B2D8E]/10 hover:bg-[#7B2D8E] text-[#7B2D8E] hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      <span className="text-sm font-medium">Instagram</span>
                    </Link>
                    <Link
                      href="https://x.com/DermaspaceN"
                      target="_blank"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 hover:bg-gray-900 text-gray-700 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span className="text-sm font-medium">Twitter</span>
                    </Link>
                  </div>
                </div>

                {/* Image Card */}
                <div className="relative rounded-3xl overflow-hidden h-44">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                    alt="Dermaspace Spa"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/80 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <p className="text-white font-bold text-lg mb-1">Visit Us Today</p>
                    <p className="text-white/80 text-sm">Experience luxury wellness</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Branches Section */}
        <section id="locations" className="py-12 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Our Branches</h2>
              <p className="text-sm text-gray-500">Visit us at any of our locations</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* V.I Branch */}
              <div className="bg-[#FDFBF9] rounded-2xl p-6 border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Victoria Island</h3>
                    <p className="text-sm text-gray-600 mb-4">237B Muri Okunola Street, Victoria Island, Lagos 106104</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="https://wa.me/+2349061836625"
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#5A1D6A] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </Link>
                      <Link
                        href="https://maps.google.com"
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
                      >
                        Get Directions
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ikoyi Branch */}
              <div className="bg-[#FDFBF9] rounded-2xl p-6 border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D4A853] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Ikoyi</h3>
                    <p className="text-sm text-gray-600 mb-4">52B Raymond Njoku Street, Off Awolowo Road, Ikoyi, Lagos</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="https://wa.me/+2349013134945"
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#5A1D6A] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </Link>
                      <Link
                        href="https://maps.google.com"
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
                      >
                        Get Directions
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
