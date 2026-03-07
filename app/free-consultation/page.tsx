"use client"

import { useState } from "react"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Heart, Phone, MapPin, Clock, CheckCircle2, Send, User, Mail, MessageSquare, Sparkles, Star, ArrowRight } from "lucide-react"
import Link from "next/link"

const concerns = [
  "Acne & Breakouts",
  "Anti-Aging",
  "Hyperpigmentation",
  "Dry Skin",
  "Oily Skin",
  "Sensitive Skin",
  "Body Treatment",
  "Waxing",
  "Other"
]

const locations = [
  { id: "vi", name: "Victoria Island", address: "237b Muri Okunola St" },
  { id: "ikoyi", name: "Ikoyi", address: "44A, Awolowo Road" }
]

const benefits = [
  { icon: Sparkles, title: "Expert Analysis", desc: "Professional skin assessment" },
  { icon: Star, title: "Personalized Plan", desc: "Tailored treatment recommendations" },
  { icon: Heart, title: "No Obligation", desc: "Free with no pressure to book" }
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
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-[#FDFBF9]">
        <Header />
        <div className="pt-24 pb-32">
          <div className="max-w-md mx-auto px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Request Received!</h1>
            <p className="text-sm text-gray-600 mb-8">
              Thank you for your interest! Our skin care experts will contact you within 24 hours to schedule your free consultation.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-full text-sm font-semibold hover:bg-[#5A1D6A] transition-colors"
            >
              Back to Home
              <ArrowRight className="w-4 h-4" />
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
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4A853]/10 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-8 w-2 h-2 bg-[#D4A853] rounded-full hidden md:block" />
        <div className="absolute bottom-1/4 right-12 w-3 h-3 bg-white/20 rounded-full hidden md:block" />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <Heart className="w-3.5 h-3.5 text-[#D4A853]" />
            <span className="text-xs font-medium text-[#D4A853] uppercase tracking-widest">100% Free</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Free Skin <span className="text-[#D4A853]">Consultation</span>
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
            Let our experts analyze your skin and create a personalized treatment plan just for you
          </p>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-8 h-0.5 bg-[#D4A853]/50" />
            <div className="w-2 h-2 rounded-full bg-[#D4A853]" />
            <div className="w-8 h-0.5 bg-[#D4A853]/50" />
          </div>
        </div>
      </section>

      {/* Benefits Bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-3 gap-4">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center">
                <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-2">
                  <benefit.icon className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <p className="text-xs font-semibold text-gray-900">{benefit.title}</p>
                <p className="text-[10px] text-gray-500 hidden sm:block">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-5 gap-8">
            
            {/* Form Section */}
            <div className="lg:col-span-3 order-2 lg:order-1">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E] flex items-center justify-center">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Request Your Consultation</h2>
                    <p className="text-xs text-gray-500">Fill the form and we will contact you within 24 hours</p>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] transition-colors"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] transition-colors"
                          placeholder="you@email.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Location *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {locations.map((location) => (
                        <label
                          key={location.id}
                          className={`relative flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${
                            formData.location === location.id
                              ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="location"
                            value={location.id}
                            required
                            checked={formData.location === location.id}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            formData.location === location.id ? 'border-[#7B2D8E]' : 'border-gray-300'
                          }`}>
                            {formData.location === location.id && (
                              <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">{location.name}</p>
                            <p className="text-[10px] text-gray-500">{location.address}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Skin Concerns */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Skin Concerns (Select all that apply)</label>
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">Additional Information (Optional)</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        rows={3}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] transition-colors resize-none"
                        placeholder="Tell us about your skin goals..."
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
                        Request Free Consultation
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 order-1 lg:order-2 space-y-5">
              {/* Image Card */}
              <div className="relative h-48 lg:h-56 rounded-2xl overflow-hidden">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team-ZfRBXBUxBsQTQK6rOGT7bTjLwrdGKB.webp"
                  alt="Dermaspace Team"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white text-sm font-semibold">Expert Team</p>
                  <p className="text-white/80 text-xs">Professional skin care specialists</p>
                </div>
              </div>

              {/* What to Expect */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4">What to Expect</h3>
                <div className="space-y-3">
                  {[
                    { num: "1", text: "We contact you within 24 hours" },
                    { num: "2", text: "Schedule at your preferred time" },
                    { num: "3", text: "Meet with our skin expert" },
                    { num: "4", text: "Get your personalized plan" }
                  ].map((step) => (
                    <div key={step.num} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-white">{step.num}</span>
                      </div>
                      <p className="text-xs text-gray-600">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-[#7B2D8E] rounded-2xl p-5 text-white">
                <h3 className="text-sm font-bold mb-3">Prefer to Call?</h3>
                <a href="tel:+2349017972919" className="flex items-center gap-3 text-sm text-white/90 hover:text-white mb-3">
                  <Phone className="w-4 h-4" />
                  +234 901 797 2919
                </a>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Clock className="w-3.5 h-3.5" />
                  Open Daily 9AM - 7PM
                </div>
              </div>

              {/* Locations */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Our Locations</h3>
                <div className="space-y-3">
                  {locations.map((loc) => (
                    <div key={loc.id} className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#7B2D8E] mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-900">{loc.name}</p>
                        <p className="text-[10px] text-gray-500">{loc.address}</p>
                      </div>
                    </div>
                  ))}
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
