"use client"

import { useState } from "react"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Calendar, Clock, User, Mail, Phone, MapPin, ChevronLeft, ChevronRight, Check, ArrowRight } from "lucide-react"

const locations = [
  { id: "vi", name: "Victoria Island", address: "237b Muri Okunola St, Victoria Island, Lagos" },
  { id: "ikoyi", name: "Ikoyi", address: "44A, Awolowo Road, Ikoyi, Lagos" }
]

const timeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
]

const concerns = [
  "Acne & Breakouts", "Anti-Aging", "Hyperpigmentation", "Dry Skin",
  "Oily Skin", "Sensitive Skin", "Body Treatment", "General Consultation"
]

export default function ConsultationPage() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    date: null as Date | null,
    time: "",
    concerns: [] as string[],
    notes: ""
  })

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth }
  }

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return date < today || date.getDay() === 0 // Disable past dates and Sundays
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const handleConcernToggle = (concern: string) => {
    setFormData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern]
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: formData.date?.toISOString()
        })
      })
      
      if (res.ok) {
        setIsSubmitted(true)
      }
    } catch {
      alert("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return formData.location !== ""
      case 2: return formData.date !== null && formData.time !== ""
      case 3: return formData.firstName && formData.lastName && formData.email && formData.phone
      default: return true
    }
  }

  if (isSubmitted) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#FDFBF9] flex items-center justify-center py-20">
          <div className="max-w-md mx-auto px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-[#7B2D8E]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Consultation Requested</h1>
            <p className="text-gray-600 mb-6">
              Thank you, {formData.firstName}! Your consultation request has been received. 
              You will receive a confirmation email shortly and our team will contact you within 24 hours to confirm your appointment.
            </p>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 text-left mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Appointment Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                  <span className="text-gray-600">{locations.find(l => l.id === formData.location)?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#7B2D8E]" />
                  <span className="text-gray-600">{formData.date && formatDate(formData.date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#7B2D8E]" />
                  <span className="text-gray-600">{formData.time}</span>
                </div>
              </div>
            </div>
            <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl text-sm font-semibold hover:bg-[#5A1D6A] transition-colors">
              Back to Home
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FDFBF9]">
        {/* Hero */}
        <section className="relative py-12 md:py-16 bg-[#7B2D8E] overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-white uppercase tracking-widest">Free Consultation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Book Your Consultation
            </h1>
            <p className="text-sm text-white/80">
              Schedule a personalized skin consultation with our experts
            </p>
          </div>
        </section>

        {/* Progress Steps */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {["Location", "Date & Time", "Your Details", "Confirm"].map((label, idx) => (
                <div key={label} className="flex items-center">
                  <div className={`flex items-center gap-2 ${idx + 1 <= step ? 'text-[#7B2D8E]' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      idx + 1 < step ? 'bg-[#7B2D8E] text-white' : 
                      idx + 1 === step ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-2 border-[#7B2D8E]' : 
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {idx + 1 < step ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className="hidden sm:block text-xs font-medium">{label}</span>
                  </div>
                  {idx < 3 && <div className={`w-8 sm:w-16 h-0.5 mx-2 ${idx + 1 < step ? 'bg-[#7B2D8E]' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <section className="py-8 md:py-10">
          <div className="max-w-3xl mx-auto px-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
              
              {/* Step 1: Location */}
              {step === 1 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Choose Your Location</h2>
                  <p className="text-sm text-gray-500 mb-6">Select your preferred Dermaspace location</p>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {locations.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => setFormData(prev => ({ ...prev, location: location.id }))}
                        className={`p-5 rounded-xl border-2 text-left transition-all ${
                          formData.location === location.id
                            ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            formData.location === location.id ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{location.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{location.address}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Date & Time */}
              {step === 2 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Select Date & Time</h2>
                  <p className="text-sm text-gray-500 mb-6">Choose your preferred appointment slot</p>
                  
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h3 className="font-semibold text-gray-900">
                          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                          <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDay }).map((_, i) => (
                          <div key={`empty-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1
                          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                          const isSelected = formData.date?.toDateString() === date.toDateString()
                          const disabled = isDateDisabled(day)
                          
                          return (
                            <button
                              key={day}
                              onClick={() => !disabled && setFormData(prev => ({ ...prev, date }))}
                              disabled={disabled}
                              className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                                isSelected
                                  ? 'bg-[#7B2D8E] text-white'
                                  : disabled
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-700 hover:bg-[#7B2D8E]/10'
                              }`}
                            >
                              {day}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Available Times</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setFormData(prev => ({ ...prev, time }))}
                            className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                              formData.time === time
                                ? 'bg-[#7B2D8E] text-white'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Personal Details */}
              {step === 3 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Your Details</h2>
                  <p className="text-sm text-gray-500 mb-6">Please provide your contact information</p>
                  
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">First Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                            placeholder="First name"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Last Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                            placeholder="Last name"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                          placeholder="you@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                          placeholder="+234 000 000 0000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Areas of Concern (Optional)</label>
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

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Additional Notes (Optional)</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                        placeholder="Any additional information..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {step === 4 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Confirm Your Booking</h2>
                  <p className="text-sm text-gray-500 mb-6">Please review your appointment details</p>
                  
                  <div className="bg-gray-50 rounded-xl p-5 mb-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Location</p>
                        <p className="font-medium text-gray-900">{locations.find(l => l.id === formData.location)?.name}</p>
                        <p className="text-xs text-gray-500">{locations.find(l => l.id === formData.location)?.address}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Date & Time</p>
                        <p className="font-medium text-gray-900">{formData.date && formatDate(formData.date)}</p>
                        <p className="text-xs text-gray-500">{formData.time}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Name</p>
                        <p className="font-medium text-gray-900">{formData.firstName} {formData.lastName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Contact</p>
                        <p className="font-medium text-gray-900">{formData.email}</p>
                        <p className="text-xs text-gray-500">{formData.phone}</p>
                      </div>
                    </div>
                    {formData.concerns.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Areas of Concern</p>
                        <div className="flex flex-wrap gap-2">
                          {formData.concerns.map((concern) => (
                            <span key={concern} className="px-2 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full text-xs">
                              {concern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#7B2D8E]/5 rounded-xl p-4 border border-[#7B2D8E]/10">
                    <p className="text-xs text-gray-600">
                      By confirming, you agree to receive appointment confirmations and reminders via email and SMS. 
                      This consultation is complimentary with no obligation.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}
                
                {step < 4 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl text-sm font-semibold hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl text-sm font-semibold hover:bg-[#5A1D6A] transition-colors disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        Confirm Booking
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
