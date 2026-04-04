'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { 
  Calendar, Clock, MapPin, ChevronRight, ChevronLeft, 
  Check, X, Search, Plus, Minus
} from 'lucide-react'

// Service categories with treatments
const serviceCategories = [
  {
    id: 'facial',
    title: 'Facial Treatments',
    description: 'Rejuvenate & glow',
    icon: '✨',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    treatments: [
      { id: 'signature', name: 'Signature Glow Facial', duration: 90, price: 45000, popular: true },
      { id: 'hydra', name: 'Hydra Facial', duration: 75, price: 35000, popular: true },
      { id: 'deep-cleanse', name: 'Deep Cleansing Facial', duration: 60, price: 20000, popular: false },
      { id: 'acne', name: 'Acne Control Facial', duration: 60, price: 25000, popular: false },
      { id: 'microneedling', name: 'Microneedling', duration: 45, price: 40000, popular: false },
      { id: 'chemical-peel', name: 'Chemical Peels', duration: 30, price: 30000, popular: false },
    ]
  },
  {
    id: 'body',
    title: 'Body Treatments',
    description: 'Relax & rejuvenate',
    icon: '🧘',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    treatments: [
      { id: 'hot-stone', name: 'Hot Stone Massage', duration: 60, price: 25000, popular: true },
      { id: 'thai', name: 'Thai Massage', duration: 90, price: 30000, popular: false },
      { id: 'sports', name: 'Sports Massage', duration: 60, price: 20000, popular: false },
      { id: 'detox', name: 'Detox Body Scrub', duration: 45, price: 18000, popular: true },
      { id: 'pregnancy', name: 'Pregnancy Massage', duration: 60, price: 25000, popular: false },
      { id: 'reflexology', name: 'Reflexology', duration: 45, price: 15000, popular: false },
    ]
  },
  {
    id: 'nail',
    title: 'Nail Care',
    description: 'Perfect nails',
    icon: '💅',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    treatments: [
      { id: 'gel-mani', name: 'Gel Manicure', duration: 45, price: 12000, popular: true },
      { id: 'gel-pedi', name: 'Gel Pedicure', duration: 60, price: 15000, popular: true },
      { id: 'hot-wax-mani', name: 'Hot Wax Manicure', duration: 45, price: 8000, popular: false },
      { id: 'hot-wax-pedi', name: 'Hot Wax Pedicure', duration: 60, price: 10000, popular: false },
      { id: 'classic-mani', name: 'Classic Manicure', duration: 30, price: 5000, popular: false },
      { id: 'classic-pedi', name: 'Classic Pedicure', duration: 45, price: 7000, popular: false },
    ]
  },
  {
    id: 'waxing',
    title: 'Waxing',
    description: 'Smooth & clean',
    icon: '🌸',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    treatments: [
      { id: 'brazilian', name: 'Brazilian Wax', duration: 45, price: 15000, popular: true },
      { id: 'full-body', name: 'Full Body Wax', duration: 120, price: 35000, popular: false },
      { id: 'bikini', name: 'Bikini Wax', duration: 30, price: 10000, popular: false },
      { id: 'arm', name: 'Full Arm Wax', duration: 30, price: 8000, popular: false },
      { id: 'leg', name: 'Full Leg Wax', duration: 45, price: 12000, popular: true },
      { id: 'underarm', name: 'Underarm Wax', duration: 15, price: 5000, popular: false },
    ]
  },
]

const locations = [
  { 
    id: 'vi', 
    name: 'Victoria Island', 
    address: '12 Adeola Odeku Street, Victoria Island',
    openHours: 'Mon-Sat: 9AM - 7PM',
    available: true 
  },
  { 
    id: 'ikoyi', 
    name: 'Ikoyi', 
    address: '45 Awolowo Road, Ikoyi',
    openHours: 'Mon-Sat: 9AM - 7PM',
    available: true 
  },
]

const timeSlots = [
  { time: '09:00', label: '9:00 AM', available: true },
  { time: '09:30', label: '9:30 AM', available: true },
  { time: '10:00', label: '10:00 AM', available: true },
  { time: '10:30', label: '10:30 AM', available: false },
  { time: '11:00', label: '11:00 AM', available: true },
  { time: '11:30', label: '11:30 AM', available: true },
  { time: '12:00', label: '12:00 PM', available: true },
  { time: '12:30', label: '12:30 PM', available: true },
  { time: '13:00', label: '1:00 PM', available: false },
  { time: '13:30', label: '1:30 PM', available: true },
  { time: '14:00', label: '2:00 PM', available: true },
  { time: '14:30', label: '2:30 PM', available: true },
  { time: '15:00', label: '3:00 PM', available: true },
  { time: '15:30', label: '3:30 PM', available: true },
  { time: '16:00', label: '4:00 PM', available: true },
  { time: '16:30', label: '4:30 PM', available: false },
  { time: '17:00', label: '5:00 PM', available: true },
  { time: '17:30', label: '5:30 PM', available: true },
]

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
  const [step, setStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [bookingRef, setBookingRef] = useState('')

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

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    const remaining = mins % 60
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
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
    return date < today || date.getDay() === 0
  }

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setBookingRef(`DS-${Date.now().toString(36).toUpperCase().slice(-6)}`)
    setShowConfirmation(true)
    setIsSubmitting(false)
  }

  const filteredCategories = serviceCategories.map(cat => ({
    ...cat,
    treatments: cat.treatments.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => searchQuery === '' || cat.treatments.length > 0)

  const days = getDaysInMonth(currentMonth)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-[#7B2D8E]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-[#7B2D8E] border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-500 font-medium">Preparing your experience...</p>
        </div>
      </div>
    )
  }

  // Confirmation Screen
  if (showConfirmation) {
    return (
      <main className="min-h-screen bg-[#FAFAFA]">
        <Header />
        <div className="pt-8 pb-20 px-4">
          <div className="max-w-lg mx-auto">
            {/* Success Animation */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-[#7B2D8E] p-8 text-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 text-[#7B2D8E]" strokeWidth={3} />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">Booking Confirmed!</h1>
                <p className="text-white/80">We can&apos;t wait to see you</p>
              </div>

              <div className="p-6">
                {/* Booking Reference */}
                <div className="bg-[#7B2D8E]/5 rounded-2xl p-4 mb-6 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Booking Reference</p>
                  <p className="text-2xl font-bold text-[#7B2D8E] tracking-wide">{bookingRef}</p>
                </div>

                {/* Appointment Details */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                    <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-semibold text-gray-900">
                        {selectedDate?.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-sm text-gray-600">{timeSlots.find(t => t.time === selectedTime)?.label}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                    <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-semibold text-gray-900">
                        Dermaspace {locations.find(l => l.id === selectedLocation)?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {locations.find(l => l.id === selectedLocation)?.address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Services Summary */}
                <div className="border-t border-gray-100 pt-4 mb-6">
                  <p className="text-sm font-medium text-gray-500 mb-3">Your Services</p>
                  <div className="space-y-2">
                    {selectedServices.map(service => (
                      <div key={service.treatmentId} className="flex justify-between items-center py-2">
                        <div>
                          <p className="font-medium text-gray-900">{service.treatmentName}</p>
                          <p className="text-xs text-gray-500">{service.duration} mins</p>
                        </div>
                        <p className="font-semibold text-gray-900">{formatPrice(service.price)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-dashed border-gray-200">
                    <div>
                      <p className="font-semibold text-gray-900">Total</p>
                      <p className="text-xs text-gray-500">{formatDuration(totalDuration)}</p>
                    </div>
                    <p className="text-xl font-bold text-[#7B2D8E]">{formatPrice(totalPrice)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Link
                    href="/dashboard/bookings"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-[#7B2D8E] text-white font-semibold rounded-2xl hover:bg-[#6B2278] transition-all"
                  >
                    View My Bookings
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center w-full py-4 text-gray-600 font-medium rounded-2xl hover:bg-gray-50 transition-all"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              </div>
            </div>

            {/* Confirmation sent notice */}
            <p className="text-center text-sm text-gray-500 mt-4">
              A confirmation has been sent to {user?.email}
            </p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <Header />
      
      <div className="pt-6 pb-32 lg:pb-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/dashboard" className="hover:text-[#7B2D8E] transition-colors">Dashboard</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900">Book Appointment</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {step === 1 && 'Choose Your Services'}
              {step === 2 && 'Select Date & Time'}
              {step === 3 && 'Review & Confirm'}
            </h1>
            <p className="text-gray-500 mt-1">
              {step === 1 && `Hi ${user?.firstName}, what would you like today?`}
              {step === 2 && 'Pick a convenient time for your appointment'}
              {step === 3 && 'Almost there! Please review your booking'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 mx-16" />
              <div 
                className="absolute top-5 left-0 h-0.5 bg-[#7B2D8E] mx-16 transition-all duration-500"
                style={{ width: `calc(${((step - 1) / 2) * 100}% - 8rem)` }}
              />
              
              {[
                { num: 1, label: 'Services' },
                { num: 2, label: 'Schedule' },
                { num: 3, label: 'Confirm' }
              ].map((s) => (
                <div key={s.num} className="flex flex-col items-center relative z-10">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300
                    ${step > s.num 
                      ? 'bg-[#7B2D8E] text-white' 
                      : step === s.num 
                        ? 'bg-[#7B2D8E] text-white ring-4 ring-[#7B2D8E]/20' 
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}>
                    {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={`text-xs font-medium mt-2 ${step >= s.num ? 'text-[#7B2D8E]' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Step 1: Services */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-3">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search treatments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#7B2D8E]/20 focus:bg-white transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`
                        px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                        ${!selectedCategory 
                          ? 'bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/25' 
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-[#7B2D8E]/30'
                        }
                      `}
                    >
                      All Services
                    </button>
                    {serviceCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`
                          px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                          ${selectedCategory === cat.id 
                            ? 'bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/25' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-[#7B2D8E]/30'
                          }
                        `}
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>

                  {/* Service Categories */}
                  {filteredCategories
                    .filter(cat => !selectedCategory || cat.id === selectedCategory)
                    .map(category => (
                    <div key={category.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                      {/* Category Header */}
                      <div className="relative h-36 sm:h-44">
                        <Image
                          src={category.image}
                          alt={category.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60" />
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <h2 className="text-xl font-bold text-white">{category.title}</h2>
                          <p className="text-sm text-white/70">{category.treatments.length} treatments</p>
                        </div>
                      </div>

                      {/* Treatments Grid */}
                      <div className="p-4">
                        <div className="grid gap-3">
                          {category.treatments.map(treatment => {
                            const isSelected = isServiceSelected(treatment.id)
                            return (
                              <button
                                key={treatment.id}
                                onClick={() => toggleService(category.id, category.title, treatment)}
                                className={`
                                  relative w-full p-4 rounded-2xl border-2 text-left transition-all duration-200
                                  ${isSelected 
                                    ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' 
                                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                  }
                                `}
                              >
                                {treatment.popular && (
                                  <span className="absolute -top-2 right-4 px-2.5 py-0.5 bg-[#7B2D8E] text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                                    Popular
                                  </span>
                                )}
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="font-semibold text-gray-900 mb-1">{treatment.name}</h3>
                                    <div className="flex items-center gap-4">
                                      <span className="text-sm text-gray-500 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4" />
                                        {treatment.duration} min
                                      </span>
                                      <span className="text-sm font-bold text-[#7B2D8E]">
                                        {formatPrice(treatment.price)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className={`
                                    w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                    ${isSelected 
                                      ? 'bg-[#7B2D8E] border-[#7B2D8E]' 
                                      : 'border-gray-300'
                                    }
                                  `}>
                                    {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 2: Date & Time */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Location Selection */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                      </div>
                      Select Location
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {locations.map(location => (
                        <button
                          key={location.id}
                          onClick={() => setSelectedLocation(location.id)}
                          className={`
                            p-4 rounded-2xl border-2 text-left transition-all
                            ${selectedLocation === location.id 
                              ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' 
                              : 'border-gray-100 hover:border-gray-200'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold text-gray-900">{location.name}</p>
                            <div className={`
                              w-5 h-5 rounded-full border-2 flex items-center justify-center
                              ${selectedLocation === location.id 
                                ? 'bg-[#7B2D8E] border-[#7B2D8E]' 
                                : 'border-gray-300'
                              }
                            `}>
                              {selectedLocation === location.id && (
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mb-1">{location.address}</p>
                          <p className="text-xs text-[#7B2D8E] font-medium">{location.openHours}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calendar */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-[#7B2D8E]" />
                        </div>
                        Select Date
                      </h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <span className="px-3 py-1 text-sm font-semibold text-gray-900 min-w-[140px] text-center">
                          {currentMonth.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((date, idx) => (
                        <div key={idx} className="aspect-square p-0.5">
                          {date ? (
                            <button
                              onClick={() => !isDateDisabled(date) && setSelectedDate(date)}
                              disabled={isDateDisabled(date)}
                              className={`
                                w-full h-full rounded-xl flex items-center justify-center text-sm font-medium transition-all relative
                                ${isDateSelected(date)
                                  ? 'bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/30'
                                  : isDateDisabled(date)
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : isToday(date)
                                      ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] hover:bg-[#7B2D8E]/20'
                                      : 'text-gray-700 hover:bg-gray-100'
                                }
                              `}
                            >
                              {date.getDate()}
                              {isToday(date) && !isDateSelected(date) && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#7B2D8E]" />
                              )}
                            </button>
                          ) : (
                            <div />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {selectedDate && (
                    <div className="bg-white rounded-3xl border border-gray-100 p-5">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center">
                          <Clock className="w-4 h-4 text-[#7B2D8E]" />
                        </div>
                        Available Times
                        <span className="ml-auto text-sm font-normal text-gray-500">
                          {selectedDate.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {timeSlots.map(slot => (
                          <button
                            key={slot.time}
                            onClick={() => slot.available && setSelectedTime(slot.time)}
                            disabled={!slot.available}
                            className={`
                              py-3 px-2 rounded-xl text-sm font-medium transition-all
                              ${selectedTime === slot.time
                                ? 'bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/30'
                                : slot.available
                                  ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                  : 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                              }
                            `}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                    {/* User Info Header */}
                    <div className="bg-[#7B2D8E] p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg">{user?.firstName} {user?.lastName}</p>
                          <p className="text-white/70 text-sm">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Appointment Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Calendar className="w-5 h-5 text-[#7B2D8E]" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Date & Time</p>
                            <p className="font-semibold text-gray-900">
                              {selectedDate?.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-sm text-gray-600">{timeSlots.find(t => t.time === selectedTime)?.label}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <MapPin className="w-5 h-5 text-[#7B2D8E]" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Location</p>
                            <p className="font-semibold text-gray-900">
                              {locations.find(l => l.id === selectedLocation)?.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {locations.find(l => l.id === selectedLocation)?.address}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Services */}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Your Services</p>
                        <div className="space-y-3">
                          {selectedServices.map(service => (
                            <div key={service.treatmentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                              <div>
                                <p className="font-medium text-gray-900">{service.treatmentName}</p>
                                <p className="text-xs text-gray-500">{service.categoryTitle} • {service.duration} min</p>
                              </div>
                              <p className="font-semibold text-[#7B2D8E]">{formatPrice(service.price)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Policies */}
                  <div className="bg-[#7B2D8E]/5 rounded-2xl p-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Cancellation Policy:</span> Free cancellation up to 24 hours before your appointment. Late cancellations may incur a fee.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Order Summary */}
            <div className="lg:w-80 xl:w-96">
              <div className="bg-white rounded-3xl border border-gray-100 p-5 lg:sticky lg:top-24">
                <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>

                {selectedServices.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Plus className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No services selected</p>
                    <p className="text-sm text-gray-400 mt-1">Choose services to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-1">
                      {selectedServices.map(service => (
                        <div key={service.treatmentId} className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{service.treatmentName}</p>
                            <p className="text-xs text-gray-500">{service.duration} min</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <p className="text-sm font-semibold text-gray-900">{formatPrice(service.price)}</p>
                            <button
                              onClick={() => toggleService(service.categoryId, service.categoryTitle, {
                                id: service.treatmentId,
                                name: service.treatmentName,
                                duration: service.duration,
                                price: service.price
                              })}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-4 space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-medium text-gray-900">{formatDuration(totalDuration)}</span>
                      </div>
                      {selectedDate && selectedTime && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Date</span>
                          <span className="font-medium text-gray-900">
                            {selectedDate.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} at {timeSlots.find(t => t.time === selectedTime)?.label}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="text-xl font-bold text-[#7B2D8E]">{formatPrice(totalPrice)}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Navigation Buttons */}
                <div className="space-y-3">
                  {step > 1 && (
                    <button
                      onClick={() => setStep(step - 1)}
                      className="w-full py-3.5 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}

                  {step === 1 && (
                    <button
                      onClick={() => setStep(2)}
                      disabled={selectedServices.length === 0}
                      className="w-full py-4 px-4 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#6B2278] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#7B2D8E]/25 disabled:shadow-none"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {step === 2 && (
                    <button
                      onClick={() => setStep(3)}
                      disabled={!selectedDate || !selectedTime || !selectedLocation}
                      className="w-full py-4 px-4 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#6B2278] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#7B2D8E]/25 disabled:shadow-none"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {step === 3 && (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="w-full py-4 px-4 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#6B2278] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#7B2D8E]/25"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
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

                <p className="text-xs text-gray-400 text-center mt-4">
                  Payment on arrival • Free cancellation 24h before
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 lg:hidden z-40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">{selectedServices.length} service(s)</p>
            <p className="text-lg font-bold text-[#7B2D8E]">{formatPrice(totalPrice)}</p>
          </div>
          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={selectedServices.length === 0}
              className="flex-1 max-w-[200px] py-3.5 bg-[#7B2D8E] text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!selectedDate || !selectedTime || !selectedLocation}
              className="flex-1 max-w-[200px] py-3.5 bg-[#7B2D8E] text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 max-w-[200px] py-3.5 bg-[#7B2D8E] text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Confirm
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      <div className="hidden lg:block">
        <Footer />
      </div>
    </main>
  )
}
