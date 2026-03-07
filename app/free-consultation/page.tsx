"use client"

import { useState } from "react"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Heart, Phone, MapPin, Clock, CheckCircle2, Send, User, Mail, MessageSquare } from "lucide-react"
import Link from "next/link"

const concerns = [
  "Acne & Breakouts",
  "Anti-Aging",
  "Hyperpigmentation",
  "Dry Skin",
  "Oily Skin",
  "Sensitive Skin",
  "Body Treatment",
  "Waxing Services",
  "Other"
]

const locations = [
  { id: "vi", name: "Victoria Island", address: "237b Muri Okunola St" },
  { id: "ikoyi", name: "Ikoyi", address: "44A, Awolowo Road" }
]

export default function FreeConsultationPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    concerns: [] as string[],
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleConcernToggle = (concern: string) => {
    setFormData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-[#FDFBF9]">
        <Header />
        <div className="pt-20 pb-32">
          <div className="max-w-md mx-auto px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h1>
            <p className="text-gray-600 mb-6">
              We have received your consultation request. Our team will contact you within 24 hours to schedule your free consultation.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7B2D8E] text-white rounded-full text-sm font-medium hover:bg-[#5A1D6A] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDFBF9]">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-14 bg-[#7B2D8E] overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A853]/10 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3">
            <Heart className="w-3 h-3 text-[#D4A853]" />
            <span className="text-xs font-medium text-[#D4A853] uppercase tracking-widest">Free Service</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Free <span className="text-[#D4A853]">Consultation</span>
          </h1>
          <p className="text-sm text-white/80 max-w-md mx-auto">
            Let our experts analyze your skin and recommend the perfect treatments
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-5 gap-8">
            
            {/* Form Section */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Request Your Consultation</h2>
                <p className="text-sm text-gray-500 mb-6">Fill out the form below and we will get back to you shortly</p>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] transition-colors"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] transition-colors"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] transition-colors"
                          placeholder="+234 000 000 0000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferred Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Location</label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {locations.map((location) => (
                        <label
                          key={location.id}
                          className={`relative flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                            formData.location === location.id
                              ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="location"
                            value={location.id}
                            checked={formData.location === location.id}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            formData.location === location.id ? 'border-[#7B2D8E]' : 'border-gray-300'
                          }`}>
                            {formData.location === location.id && (
                              <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{location.name}</p>
                            <p className="text-xs text-gray-500">{location.address}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Skin Concerns */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Skin Concerns (Select all that apply)</label>
                    <div className="flex flex-wrap gap-2">
                      {concerns.map((concern) => (
                        <button
                          key={concern}
                          type="button"
                          onClick={() => handleConcernToggle(concern)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            formData.concerns.includes(concern)
                              ? 'bg-[#7B2D8E] text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {concern}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Message (Optional)</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        rows={3}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] transition-colors resize-none"
                        placeholder="Tell us more about your skin concerns..."
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#7B2D8E] text-white rounded-xl text-sm font-semibold hover:bg-[#5A1D6A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Request Consultation
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-5">
              {/* What to Expect */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4">What to Expect</h3>
                <div className="space-y-3">
                  {[
                    { num: "1", text: "We will contact you within 24 hours" },
                    { num: "2", text: "Schedule at your preferred location" },
                    { num: "3", text: "Meet with our skin expert" },
                    { num: "4", text: "Get personalized recommendations" }
                  ].map((step) => (
                    <div key={step.num} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#7B2D8E]">{step.num}</span>
                      </div>
                      <p className="text-sm text-gray-600">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-[#7B2D8E] rounded-2xl p-5 text-white">
                <h3 className="text-sm font-bold mb-4">Need Immediate Help?</h3>
                <div className="space-y-3">
                  <a href="tel:+2349017972919" className="flex items-center gap-3 text-sm text-white/90 hover:text-white">
                    <Phone className="w-4 h-4" />
                    +234 901 797 2919
                  </a>
                  <a href="https://wa.me/+2349013134945" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/90 hover:text-white">
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp Us
                  </a>
                </div>
              </div>

              {/* Locations */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Our Locations</h3>
                <div className="space-y-4">
                  {locations.map((loc) => (
                    <div key={loc.id} className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-[#7B2D8E] mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{loc.name}</p>
                        <p className="text-xs text-gray-500">{loc.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  Open Daily: 9AM - 7PM
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
