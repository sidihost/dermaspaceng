"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from "lucide-react"

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
        {/* Hero */}
        <section className="pt-24 pb-12 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 bg-[#7B2D8E]/10 rounded-full text-sm font-medium text-[#7B2D8E] mb-4">
              Contact Us
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h1>
            <p className="text-gray-600">
              Have questions or want to book an appointment? We&apos;d love to hear from you.
            </p>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-4">
              <a
                href="tel:+2349017972919"
                className="flex flex-col items-center p-6 bg-white rounded-2xl border border-gray-100 hover:border-[#7B2D8E]/20 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center mb-3">
                  <Phone className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <span className="font-semibold text-gray-900 mb-1">Call Us</span>
                <span className="text-sm text-gray-500">+234 901 797 2919</span>
              </a>

              <a
                href="mailto:info@dermaspaceng.com"
                className="flex flex-col items-center p-6 bg-white rounded-2xl border border-gray-100 hover:border-[#7B2D8E]/20 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center mb-3">
                  <Mail className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <span className="font-semibold text-gray-900 mb-1">Email Us</span>
                <span className="text-sm text-gray-500">info@dermaspaceng.com</span>
              </a>

              <a
                href="https://wa.me/+2349017972919"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-6 bg-white rounded-2xl border border-gray-100 hover:border-[#7B2D8E]/20 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center mb-3">
                  <MessageCircle className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <span className="font-semibold text-gray-900 mb-1">WhatsApp</span>
                <span className="text-sm text-gray-500">Chat with us</span>
              </a>
            </div>
          </div>
        </section>

        {/* Form & Info */}
        <section className="py-12 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-8">
              {/* Contact Form */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Send a Message</h2>
                  <p className="text-sm text-gray-500 mb-6">We&apos;ll get back to you within 24 hours</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E] outline-none transition-colors"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E] outline-none transition-colors"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E] outline-none transition-colors"
                          placeholder="+234 xxx xxx xxxx"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Subject
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E] outline-none transition-colors bg-white"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Message
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E] outline-none transition-colors resize-none"
                        placeholder="How can we help you?"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#6B2280] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
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

              {/* Locations */}
              <div className="lg:col-span-2 space-y-4">
                {/* Victoria Island */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[#7B2D8E]">VI</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Victoria Island</h3>
                      <p className="text-sm text-gray-500">237B Muri Okunola Street</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>+234 906 183 6625</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
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
                      className="flex-1 py-2.5 text-center text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Directions
                    </Link>
                  </div>
                </div>

                {/* Ikoyi */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[#7B2D8E]">IKY</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Ikoyi</h3>
                      <p className="text-sm text-gray-500">44A, Awolowo Road</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>+234 901 313 4945</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
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
                      className="flex-1 py-2.5 text-center text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Directions
                    </Link>
                  </div>
                </div>

                {/* Hours Card */}
                <div className="bg-[#7B2D8E] rounded-2xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">Opening Hours</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/80">Monday - Friday</span>
                      <span>9:00 AM - 7:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Saturday</span>
                      <span>9:00 AM - 7:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Sunday</span>
                      <span>Closed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-12 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                  <span className="font-medium text-gray-900">Find Us</span>
                </div>
              </div>
              <div className="aspect-[2/1] md:aspect-[3/1] bg-gray-100">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.5!2d3.4219!3d6.4281!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwMjUnNDEuMiJOIDPCsDI1JzE4LjgiRQ!5e0!3m2!1sen!2sng!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
