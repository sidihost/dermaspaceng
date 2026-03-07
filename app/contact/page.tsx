"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Phone, Mail, MapPin, Clock, Send, ChevronRight, MessageCircle, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react"

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
  const [focusedField, setFocusedField] = useState<string | null>(null)

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

  const contactMethods = [
    {
      icon: Phone,
      title: "Call Us",
      subtitle: "Speak directly with our team",
      value: "+234 901 797 2919",
      action: "tel:+2349017972919",
      color: "from-purple-500 to-[#7B2D8E]"
    },
    {
      icon: Mail,
      title: "Email Us",
      subtitle: "We reply within 24 hours",
      value: "info@dermaspaceng.com",
      action: "mailto:info@dermaspaceng.com",
      color: "from-pink-500 to-rose-500"
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      subtitle: "Quick responses guaranteed",
      value: "Chat with us",
      action: "https://wa.me/+2349017972919",
      color: "from-green-500 to-emerald-500"
    }
  ]

  const features = [
    "Free skin consultation",
    "Expert recommendations",
    "Personalized treatment plans",
    "Priority booking access"
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-[#FDFBF9] to-white">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[#7B2D8E]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-pink-200/30 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
          </div>
          
          <div className="relative max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 mb-6">
                  <Sparkles className="w-4 h-4 text-[#7B2D8E]" />
                  <span className="text-sm font-medium text-[#7B2D8E]">Get in Touch</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  Let&apos;s Start Your
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#7B2D8E] to-pink-500">
                    Wellness Journey
                  </span>
                </h1>
                
                <p className="text-lg text-gray-600 mb-8 max-w-lg">
                  Have questions about our services? Want to book a consultation? We&apos;re here to help you achieve your skin goals.
                </p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#7B2D8E]" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Contact Methods */}
                <div className="space-y-3">
                  {contactMethods.map((method, i) => (
                    <a
                      key={i}
                      href={method.action}
                      target={method.action.startsWith('http') ? '_blank' : undefined}
                      rel={method.action.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-[#7B2D8E]/20 transition-all duration-300"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center flex-shrink-0`}>
                        <method.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{method.title}</p>
                        <p className="text-sm text-gray-500">{method.subtitle}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#7B2D8E] group-hover:underline">{method.value}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Right - Contact Form */}
              <div className="relative">
                {/* Form Card */}
                <div className="relative bg-white rounded-3xl p-8 shadow-2xl shadow-[#7B2D8E]/10 border border-gray-100">
                  {/* Decorative gradient */}
                  <div className="absolute -top-px left-8 right-8 h-1 bg-gradient-to-r from-[#7B2D8E] via-pink-500 to-[#7B2D8E] rounded-full" />
                  
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Send us a Message</h2>
                    <p className="text-gray-500 mt-1">We typically respond within a few hours</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name & Email Row */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          focusedField === 'name' || formData.name 
                            ? '-top-2.5 text-xs bg-white px-1 text-[#7B2D8E]' 
                            : 'top-3.5 text-sm text-gray-400'
                        }`}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          onFocus={() => setFocusedField('name')}
                          onBlur={() => setFocusedField(null)}
                          className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#7B2D8E] outline-none transition-colors"
                        />
                      </div>
                      <div className="relative">
                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          focusedField === 'email' || formData.email 
                            ? '-top-2.5 text-xs bg-white px-1 text-[#7B2D8E]' 
                            : 'top-3.5 text-sm text-gray-400'
                        }`}>
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#7B2D8E] outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Phone & Subject Row */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          focusedField === 'phone' || formData.phone 
                            ? '-top-2.5 text-xs bg-white px-1 text-[#7B2D8E]' 
                            : 'top-3.5 text-sm text-gray-400'
                        }`}>
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          onFocus={() => setFocusedField('phone')}
                          onBlur={() => setFocusedField(null)}
                          className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#7B2D8E] outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#7B2D8E] outline-none transition-colors bg-white text-gray-700"
                        >
                          <option value="">Select Subject</option>
                          <option value="booking">Book Appointment</option>
                          <option value="inquiry">General Inquiry</option>
                          <option value="membership">Membership Info</option>
                          <option value="feedback">Feedback</option>
                          <option value="partnership">Partnership</option>
                        </select>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="relative">
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        focusedField === 'message' || formData.message 
                          ? '-top-2.5 text-xs bg-white px-1 text-[#7B2D8E]' 
                          : 'top-3.5 text-sm text-gray-400'
                      }`}>
                        Your Message
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        onFocus={() => setFocusedField('message')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#7B2D8E] outline-none transition-colors resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 px-6 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#7B2D8E]/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
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

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-pink-200 to-purple-200 rounded-2xl rotate-12 opacity-60" />
                <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-br from-[#7B2D8E]/20 to-pink-200/50 rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Locations Section */}
        <section className="py-20 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%237B2D8E\" fill-opacity=\"0.03\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
          
          <div className="max-w-6xl mx-auto px-4 relative">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
                <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-wider">Our Locations</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Visit Our Spa Centres
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Experience luxury wellness at either of our premium locations
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Victoria Island */}
              <div className="group relative bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] rounded-3xl overflow-hidden">
                <div className="absolute inset-0">
                  <Image
                    src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=400&fit=crop"
                    alt="Victoria Island Spa"
                    fill
                    className="object-cover opacity-30 group-hover:opacity-40 transition-opacity"
                  />
                </div>
                <div className="relative p-8">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                    <span className="text-xl font-bold text-white">VI</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Victoria Island</h3>
                  <p className="text-white/80 mb-6">237B Muri Okunola Street, Victoria Island, Lagos</p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-white/90">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">+234 906 183 6625</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Mon - Sat: 9AM - 7PM</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Link
                      href="https://wa.me/+2349061836625"
                      target="_blank"
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-[#7B2D8E] rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Link>
                    <Link
                      href="https://maps.google.com/maps?q=6.4281,3.4219"
                      target="_blank"
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      Directions
                    </Link>
                  </div>
                </div>
              </div>

              {/* Ikoyi */}
              <div className="group relative bg-gradient-to-br from-pink-600 to-rose-700 rounded-3xl overflow-hidden">
                <div className="absolute inset-0">
                  <Image
                    src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop"
                    alt="Ikoyi Spa"
                    fill
                    className="object-cover opacity-30 group-hover:opacity-40 transition-opacity"
                  />
                </div>
                <div className="relative p-8">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                    <span className="text-xl font-bold text-white">IKY</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Ikoyi</h3>
                  <p className="text-white/80 mb-6">44A, Awolowo Road, Ikoyi, Lagos</p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-white/90">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">+234 901 313 4945</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Mon - Sat: 9AM - 7PM</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Link
                      href="https://wa.me/+2349013134945"
                      target="_blank"
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-rose-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Link>
                    <Link
                      href="https://maps.google.com/maps?q=6.4461,3.4384"
                      target="_blank"
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      Directions
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-[#7B2D8E] to-[#5A1D6A] relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="max-w-4xl mx-auto px-4 text-center relative">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Skin?
            </h2>
            <p className="text-white/80 mb-8 max-w-lg mx-auto">
              Book your free consultation today and let our experts create a personalized treatment plan for you.
            </p>
            <Link
              href="/consultation"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#7B2D8E] font-semibold rounded-full hover:shadow-xl transition-all"
            >
              Book Free Consultation
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
