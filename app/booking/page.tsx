'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import { 
  Calendar, Clock, MapPin, ChevronRight, ChevronLeft, 
  Check, Star, Users, Phone, X, ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Service categories with treatments
const serviceCategories = [
  {
    id: 'body',
    title: 'Body Treatments',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    treatments: [
      { id: 'hot-stone', name: 'Hot Stone Massage', duration: 60, price: 25000 },
      { id: 'thai', name: 'Thai Massage', duration: 90, price: 30000 },
      { id: 'sports', name: 'Sports Massage', duration: 60, price: 20000 },
      { id: 'detox', name: 'Detox Body Scrub', duration: 45, price: 18000 },
      { id: 'pregnancy', name: 'Pregnancy Massage', duration: 60, price: 25000 },
      { id: 'reflexology', name: 'Reflexology', duration: 45, price: 15000 },
    ]
  },
  {
    id: 'facial',
    title: 'Facial Treatments',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    treatments: [
      { id: 'deep-cleanse', name: 'Deep Cleansing Facial', duration: 60, price: 20000 },
      { id: 'hydra', name: 'Hydra Facial', duration: 75, price: 35000 },
      { id: 'acne', name: 'Acne Facial', duration: 60, price: 25000 },
      { id: 'microneedling', name: 'Microneedling', duration: 45, price: 40000 },
      { id: 'chemical-peel', name: 'Chemical Peels', duration: 30, price: 30000 },
      { id: 'signature', name: 'Signature Facial', duration: 90, price: 45000 },
    ]
  },
  {
    id: 'nail',
    title: 'Nail Care',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    treatments: [
      { id: 'hot-wax-mani', name: 'Hot Wax Manicure', duration: 45, price: 8000 },
      { id: 'hot-wax-pedi', name: 'Hot Wax Pedicure', duration: 60, price: 10000 },
      { id: 'jelly-pedi', name: 'Jelly Pedicure', duration: 60, price: 12000 },
      { id: 'classic-mani', name: 'Classic Manicure', duration: 30, price: 5000 },
      { id: 'classic-pedi', name: 'Classic Pedicure', duration: 45, price: 7000 },
      { id: 'gel-polish', name: 'Gel Polish', duration: 30, price: 6000 },
    ]
  },
  {
    id: 'waxing',
    title: 'Waxing',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    treatments: [
      { id: 'full-body', name: 'Full Body Wax', duration: 120, price: 35000 },
      { id: 'brazilian', name: 'Brazilian Wax', duration: 45, price: 15000 },
      { id: 'bikini', name: 'Bikini Wax', duration: 30, price: 10000 },
      { id: 'arm', name: 'Full Arm Wax', duration: 30, price: 8000 },
      { id: 'leg', name: 'Full Leg Wax', duration: 45, price: 12000 },
      { id: 'underarm', name: 'Underarm Wax', duration: 15, price: 5000 },
    ]
  },
]

const locations = [
  { id: 'vi', name: 'Victoria Island', address: '12 Adeola Odeku St, VI', available: true },
  { id: 'ikoyi', name: 'Ikoyi', address: '45 Awolowo Road, Ikoyi', available: true },
]

const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
]

type BookingStep = 'service' | 'datetime' | 'confirm'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
}

interface SelectedService {
  categoryId: string
  categoryTitle: string
  treatmentId: string
  treatmentName: string
  duration: number
  price: number
}

export default function BookingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [step, setStep] = useState<BookingStep>('service')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          router.push('/signin?redirect=/booking')
        }
      } catch {
        router.push('/signin?redirect=/booking')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [router])

  const toggleService = (categoryId: string, categoryTitle: string, treatment: { id: string; name: string; duration: number; price: number }) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.treatmentId === treatment.id)
      if (exists) {
        return prev.filter(s => s.treatmentId !== treatment.id)
      }
      return [...prev, {
        categoryId,
        categoryTitle,
        treatmentId: treatment.id,
        treatmentName: treatment.name,
        duration: treatment.duration,
        price: treatment.price
      }]
    })
  }

  const isServiceSelected = (treatmentId: string) => {
    return selectedServices.some(s => s.treatmentId === treatmentId)
  }

  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0)
  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price)
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days: (Date | null)[] = []
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today || date.getDay() === 0 // Disable past dates and Sundays
  }

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setShowConfirmation(true)
    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (showConfirmation) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-[#7B2D8E]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600 mb-8">
              Thank you, {user?.firstName}! Your appointment has been scheduled. We&apos;ve sent a confirmation to {user?.email}
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-6 text-left mb-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Date & Time</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Location</span>
                  <span className="text-sm font-medium text-gray-900">
                    {locations.find(l => l.id === selectedLocation)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Services</span>
                  <span className="text-sm font-medium text-gray-900">{selectedServices.length} treatment(s)</span>
                </div>
                <div className="pt-4 border-t border-gray-200 flex justify-between">
                  <span className="text-sm font-medium text-gray-900">Total</span>
                  <span className="text-lg font-bold text-[#7B2D8E]">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard"
                className="flex-1 py-3 px-6 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-center"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/dashboard/bookings"
                className="flex-1 py-3 px-6 text-sm font-medium text-white bg-[#7B2D8E] rounded-xl hover:bg-[#6B2278] transition-colors text-center"
              >
                View Bookings
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Personalized Welcome */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Book Your Experience, {user?.firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Select your services and preferred time</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[
              { id: 'service', label: 'Services', step: 1 },
              { id: 'datetime', label: 'Date & Time', step: 2 },
              { id: 'confirm', label: 'Confirm', step: 3 },
            ].map((s, idx) => (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    step === s.id 
                      ? "bg-[#7B2D8E] text-white" 
                      : (step === 'datetime' && idx === 0) || (step === 'confirm' && idx <= 1)
                        ? "bg-[#7B2D8E]/10 text-[#7B2D8E]"
                        : "bg-gray-100 text-gray-400"
                  )}>
                    {(step === 'datetime' && idx === 0) || (step === 'confirm' && idx <= 1) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      s.step
                    )}
                  </div>
                  <span className={cn(
                    "text-xs mt-1 hidden sm:block",
                    step === s.id ? "text-[#7B2D8E] font-medium" : "text-gray-400"
                  )}>
                    {s.label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={cn(
                    "w-12 sm:w-20 h-0.5 mx-2",
                    (step === 'datetime' && idx === 0) || (step === 'confirm')
                      ? "bg-[#7B2D8E]/30"
                      : "bg-gray-200"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Panel */}
          <div className="flex-1">
            {/* Step 1: Select Services */}
            {step === 'service' && (
              <div className="space-y-4">
                {/* Category Tabs */}
                <div className="bg-white rounded-2xl border border-gray-100 p-2 overflow-x-auto">
                  <div className="flex gap-2 min-w-max">
                    {serviceCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                          selectedCategory === cat.id
                            ? "bg-[#7B2D8E] text-white"
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Services List */}
                {serviceCategories.map(category => (
                  <div
                    key={category.id}
                    className={cn(
                      "bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all",
                      selectedCategory && selectedCategory !== category.id ? "hidden" : ""
                    )}
                  >
                    {/* Category Header */}
                    <div className="relative h-32 sm:h-40">
                      <Image
                        src={category.image}
                        alt={category.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <h2 className="text-lg font-bold text-white">{category.title}</h2>
                        <p className="text-xs text-white/80">{category.treatments.length} treatments available</p>
                      </div>
                    </div>

                    {/* Treatments */}
                    <div className="p-4 space-y-2">
                      {category.treatments.map(treatment => (
                        <button
                          key={treatment.id}
                          onClick={() => toggleService(category.id, category.title, treatment)}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                            isServiceSelected(treatment.id)
                              ? "border-[#7B2D8E] bg-[#7B2D8E]/5"
                              : "border-gray-100 hover:border-gray-200"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{treatment.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {treatment.duration} mins
                              </span>
                              <span className="text-sm font-semibold text-[#7B2D8E]">
                                {formatPrice(treatment.price)}
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 transition-colors",
                            isServiceSelected(treatment.id)
                              ? "border-[#7B2D8E] bg-[#7B2D8E]"
                              : "border-gray-300"
                          )}>
                            {isServiceSelected(treatment.id) && (
                              <Check className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: Date & Time */}
            {step === 'datetime' && (
              <div className="space-y-4">
                {/* Location Selection */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Select Location</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {locations.map(location => (
                      <button
                        key={location.id}
                        onClick={() => setSelectedLocation(location.id)}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all",
                          selectedLocation === location.id
                            ? "border-[#7B2D8E] bg-[#7B2D8E]/5"
                            : "border-gray-100 hover:border-gray-200"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            selectedLocation === location.id
                              ? "bg-[#7B2D8E]/10"
                              : "bg-gray-100"
                          )}>
                            <MapPin className={cn(
                              "w-5 h-5",
                              selectedLocation === location.id ? "text-[#7B2D8E]" : "text-gray-400"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{location.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{location.address}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Select Date</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="text-sm font-medium text-gray-900 min-w-[120px] text-center">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Days header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(currentMonth).map((date, idx) => (
                      <div key={idx} className="aspect-square">
                        {date ? (
                          <button
                            onClick={() => !isDateDisabled(date) && setSelectedDate(date)}
                            disabled={isDateDisabled(date)}
                            className={cn(
                              "w-full h-full rounded-lg flex items-center justify-center text-sm font-medium transition-all",
                              isDateSelected(date)
                                ? "bg-[#7B2D8E] text-white"
                                : isDateDisabled(date)
                                  ? "text-gray-300 cursor-not-allowed"
                                  : "text-gray-900 hover:bg-[#7B2D8E]/10"
                            )}
                          >
                            {date.getDate()}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Select Time</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {timeSlots.map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
                            selectedTime === time
                              ? "bg-[#7B2D8E] text-white"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && (
              <div className="space-y-4">
                {/* Booking Summary */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>
                  
                  {/* Date & Time */}
                  <div className="flex items-center gap-4 p-4 bg-[#7B2D8E]/5 rounded-xl mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-gray-500">{selectedTime} - {locations.find(l => l.id === selectedLocation)?.name}</p>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="space-y-3">
                    {selectedServices.map(service => (
                      <div key={service.treatmentId} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">{service.treatmentName}</p>
                          <p className="text-xs text-gray-500">{service.categoryTitle} - {service.duration} mins</p>
                        </div>
                        <span className="font-semibold text-gray-900">{formatPrice(service.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Users className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Note */}
                <div className="bg-[#7B2D8E]/5 rounded-2xl p-4 border border-[#7B2D8E]/10">
                  <p className="text-sm text-[#7B2D8E]">
                    Payment will be collected at the spa. We accept cash, card, and bank transfers.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:sticky lg:top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Your Selection</h3>
              
              {selectedServices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No services selected yet</p>
                  <p className="text-xs text-gray-400 mt-1">Browse and add services to get started</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
                    {selectedServices.map(service => (
                      <div key={service.treatmentId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{service.treatmentName}</p>
                          <p className="text-xs text-gray-500">{service.duration} mins</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{formatPrice(service.price)}</span>
                          <button
                            onClick={() => toggleService(service.categoryId, service.categoryTitle, { 
                              id: service.treatmentId, 
                              name: service.treatmentName, 
                              duration: service.duration, 
                              price: service.price 
                            })}
                            className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                          >
                            <X className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Duration</span>
                      <span className="font-medium text-gray-900">{totalDuration} mins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total</span>
                      <span className="text-lg font-bold text-[#7B2D8E]">{formatPrice(totalPrice)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="mt-6 space-y-2">
                {step === 'service' && (
                  <button
                    onClick={() => setStep('datetime')}
                    disabled={selectedServices.length === 0}
                    className={cn(
                      "w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors",
                      selectedServices.length > 0
                        ? "bg-[#7B2D8E] text-white hover:bg-[#6B2278]"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {step === 'datetime' && (
                  <>
                    <button
                      onClick={() => setStep('confirm')}
                      disabled={!selectedLocation || !selectedDate || !selectedTime}
                      className={cn(
                        "w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors",
                        selectedLocation && selectedDate && selectedTime
                          ? "bg-[#7B2D8E] text-white hover:bg-[#6B2278]"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setStep('service')}
                      className="w-full py-3 px-4 rounded-xl font-medium text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Back to Services
                    </button>
                  </>
                )}

                {step === 'confirm' && (
                  <>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-[#7B2D8E] text-white hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          Confirm Booking
                          <Check className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setStep('datetime')}
                      className="w-full py-3 px-4 rounded-xl font-medium text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Back to Date & Time
                    </button>
                  </>
                )}
              </div>

              {/* Contact Support */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center mb-2">Need help with your booking?</p>
                <a
                  href="tel:+2349017972919"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-[#7B2D8E] hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  Call +234 901 797 2919
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
