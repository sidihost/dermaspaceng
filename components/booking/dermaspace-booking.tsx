'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  Calendar, Clock, User, MapPin, ChevronRight, ChevronLeft,
  Check, X, Sparkles, Star, Gift, AlertCircle, Loader2, LogIn
} from 'lucide-react'
import Link from 'next/link'

interface UserData {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
}

interface Service {
  id: string
  name: string
  description: string
  category: string
  price: number
  duration: number
  is_featured: boolean
}

interface Category {
  id: string
  name: string
}

interface TimeSlot {
  time: string
  available: boolean
}

interface BookingData {
  service: Service | null
  date: Date | null
  time: string | null
  location: string
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
  voucherCode: string
  voucherDiscount: number
}

const categories: Category[] = [
  { id: 'all', name: 'All Services' },
  { id: 'facial', name: 'Facials' },
  { id: 'body', name: 'Body Treatments' },
  { id: 'laser', name: 'Laser & Advanced' },
  { id: 'massage', name: 'Massages' },
  { id: 'packages', name: 'Packages' },
]

const services: Service[] = [
  {
    id: 's1',
    name: 'Classic Facial',
    description: 'Deep cleansing facial with extraction and hydrating mask',
    category: 'facial',
    price: 25000,
    duration: 60,
    is_featured: true,
  },
  {
    id: 's2',
    name: 'Hydra Facial',
    description: 'Multi-step treatment that cleanses, exfoliates and hydrates',
    category: 'facial',
    price: 45000,
    duration: 75,
    is_featured: true,
  },
  {
    id: 's3',
    name: 'LED Light Therapy',
    description: 'Stimulates collagen production and kills acne bacteria',
    category: 'facial',
    price: 35000,
    duration: 45,
    is_featured: false,
  },
  {
    id: 's4',
    name: 'Chemical Peel',
    description: 'Professional exfoliation for smoother, brighter skin',
    category: 'laser',
    price: 55000,
    duration: 60,
    is_featured: true,
  },
  {
    id: 's5',
    name: 'Laser Hair Removal',
    description: 'Permanent hair reduction for smooth skin',
    category: 'laser',
    price: 40000,
    duration: 45,
    is_featured: false,
  },
  {
    id: 's6',
    name: 'Body Scrub & Wrap',
    description: 'Full body exfoliation with nourishing body wrap',
    category: 'body',
    price: 50000,
    duration: 90,
    is_featured: false,
  },
  {
    id: 's7',
    name: 'Swedish Massage',
    description: 'Relaxing full body massage with essential oils',
    category: 'massage',
    price: 30000,
    duration: 60,
    is_featured: false,
  },
  {
    id: 's8',
    name: 'Deep Tissue Massage',
    description: 'Intense massage targeting muscle tension',
    category: 'massage',
    price: 40000,
    duration: 75,
    is_featured: false,
  },
  {
    id: 's9',
    name: 'Glow Package',
    description: 'Facial + LED Therapy + Mini Massage - Save 15%',
    category: 'packages',
    price: 85000,
    duration: 150,
    is_featured: true,
  },
  {
    id: 's10',
    name: 'Bridal Package',
    description: 'Complete prep: Facial + Body Treatment + Massage',
    category: 'packages',
    price: 120000,
    duration: 180,
    is_featured: true,
  },
]

const locations = [
  { id: 'vi', name: 'Victoria Island', address: '15 Adeola Odeku Street, VI' },
  { id: 'ikoyi', name: 'Ikoyi', address: '24 Alexander Road, Ikoyi' },
]

const generateTimeSlots = (date: Date): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  const currentHour = today.getHours()
  
  for (let hour = 9; hour <= 19; hour++) {
    const time = `${hour.toString().padStart(2, '0')}:00`
    const halfTime = `${hour.toString().padStart(2, '0')}:30`
    
    const isPopularTime = hour >= 10 && hour <= 16
    const baseAvailability = isPopularTime ? 0.6 : 0.85
    
    if (!isToday || hour > currentHour) {
      slots.push({ time, available: Math.random() > (1 - baseAvailability) })
      if (hour < 19) {
        slots.push({ time: halfTime, available: Math.random() > (1 - baseAvailability) })
      }
    }
  }
  return slots
}

export function DermaspaceBooking({ className }: { className?: string }) {
  const [step, setStep] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false)
  const [voucherError, setVoucherError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingReference, setBookingReference] = useState('')
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  
  const [booking, setBooking] = useState<BookingData>({
    service: null,
    date: null,
    time: null,
    location: locations[0].id,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
    voucherCode: '',
    voucherDiscount: 0,
  })

  // Check for logged in user
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            // Pre-fill booking data with user info
            setBooking(prev => ({
              ...prev,
              firstName: data.user.first_name || '',
              lastName: data.user.last_name || '',
              email: data.user.email || '',
              phone: data.user.phone || '',
            }))
          }
        }
      } catch {
        // Not logged in, that's okay
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
  }

  const filteredServices = services.filter(service => {
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    const matchesSearch = !searchQuery || 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

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
    return date < today
  }

  const handleDateSelect = (date: Date) => {
    setBooking(prev => ({ ...prev, date, time: null }))
    setTimeSlots(generateTimeSlots(date))
  }

  const applyVoucher = async () => {
    if (!booking.voucherCode.trim()) return
    
    setIsApplyingVoucher(true)
    setVoucherError('')
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const validVouchers: Record<string, number> = {
      'WELCOME10': 10,
      'GLOW20': 20,
      'VIP25': 25,
      'DERMA15': 15,
    }
    
    const discount = validVouchers[booking.voucherCode.toUpperCase()]
    if (discount) {
      setBooking(prev => ({ ...prev, voucherDiscount: discount }))
    } else {
      setVoucherError('Invalid voucher code')
    }
    
    setIsApplyingVoucher(false)
  }

  const removeVoucher = () => {
    setBooking(prev => ({ ...prev, voucherCode: '', voucherDiscount: 0 }))
    setVoucherError('')
  }

  // Handle proceeding to step 4 - check auth
  const handleProceedToReview = () => {
    if (!user) {
      setShowAuthPrompt(true)
    } else {
      setStep(4)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      setShowAuthPrompt(true)
      return
    }

    setIsSubmitting(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const ref = `DS${Date.now().toString(36).toUpperCase()}`
    setBookingReference(ref)
    
    // Save booking to localStorage for dashboard sync
    const bookingData = {
      id: ref,
      service: booking.service?.name,
      date: booking.date?.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: booking.time,
      location: locations.find(l => l.id === booking.location)?.name,
      status: 'confirmed',
    }
    
    const existingBookings = JSON.parse(localStorage.getItem(`dermaspace-bookings-${user.id}`) || '[]')
    existingBookings.unshift(bookingData)
    localStorage.setItem(`dermaspace-bookings-${user.id}`, JSON.stringify(existingBookings))
    
    // Update loyalty points (1 point per 100 NGN)
    const pointsEarned = Math.floor(getFinalPrice() / 100)
    const existingLoyalty = JSON.parse(localStorage.getItem(`dermaspace-loyalty-${user.id}`) || '{"points":0,"tier":"Standard","totalSpent":0,"totalBookings":0,"nextTierPoints":500,"pointsToNextTier":500}')
    existingLoyalty.points += pointsEarned
    existingLoyalty.totalSpent += getFinalPrice()
    existingLoyalty.totalBookings += 1
    existingLoyalty.pointsToNextTier = Math.max(0, existingLoyalty.nextTierPoints - existingLoyalty.points)
    
    // Update tier
    if (existingLoyalty.points >= 2000) {
      existingLoyalty.tier = 'Platinum'
      existingLoyalty.nextTierPoints = 5000
    } else if (existingLoyalty.points >= 1000) {
      existingLoyalty.tier = 'Gold'
      existingLoyalty.nextTierPoints = 2000
    } else if (existingLoyalty.points >= 500) {
      existingLoyalty.tier = 'Silver'
      existingLoyalty.nextTierPoints = 1000
    }
    existingLoyalty.pointsToNextTier = Math.max(0, existingLoyalty.nextTierPoints - existingLoyalty.points)
    
    localStorage.setItem(`dermaspace-loyalty-${user.id}`, JSON.stringify(existingLoyalty))
    
    setBookingComplete(true)
    setIsSubmitting(false)
  }

  const canProceedToStep2 = booking.service !== null
  const canProceedToStep3 = booking.date !== null && booking.time !== null
  const canProceedToStep4 = booking.firstName && booking.lastName && booking.email && booking.phone

  const getFinalPrice = () => {
    if (!booking.service) return 0
    const basePrice = booking.service.price
    if (booking.voucherDiscount > 0) {
      return basePrice - (basePrice * booking.voucherDiscount / 100)
    }
    return basePrice
  }

  if (isLoading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#7B2D8E]" />
        </div>
      </div>
    )
  }

  // Auth Prompt Modal
  if (showAuthPrompt) {
    return (
      <div className={cn('w-full', className)}>
        <div className="p-6 sm:p-10">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-10 h-10 text-[#7B2D8E]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Sign In to Continue</h2>
            <p className="text-gray-600 mb-8">
              Please sign in or create an account to complete your booking. This helps us provide you with a personalized experience and manage your appointments.
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left">
              <h3 className="font-medium text-gray-900 mb-3">Your Selection</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-medium text-gray-900">{booking.service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium text-gray-900">
                    {booking.date?.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="font-medium text-gray-900">{booking.time}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Link
                href={`/login?redirect=/booking&booking=${encodeURIComponent(JSON.stringify({ serviceId: booking.service?.id, date: booking.date?.toISOString(), time: booking.time, location: booking.location }))}`}
                className="w-full py-3.5 bg-[#7B2D8E] text-white rounded-xl font-medium hover:bg-[#6B1D7E] transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                href={`/signup?redirect=/booking&booking=${encodeURIComponent(JSON.stringify({ serviceId: booking.service?.id, date: booking.date?.toISOString(), time: booking.time, location: booking.location }))}`}
                className="w-full py-3.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Create Account
              </Link>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="text-sm text-gray-500 hover:text-gray-700 mt-2"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (bookingComplete) {
    return (
      <div className={cn('w-full', className)}>
        <div className="p-6 sm:p-10">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-8">
              Thank you{user ? `, ${user.first_name}` : ''}! Your appointment has been successfully booked. 
              We&apos;ve sent a confirmation to your email.
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
                <span className="text-sm text-gray-500">Booking Reference</span>
                <span className="font-mono font-bold text-lg text-[#7B2D8E]">{bookingReference}</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Service</span>
                  <span className="text-sm font-medium text-gray-900">{booking.service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Date</span>
                  <span className="text-sm font-medium text-gray-900">
                    {booking.date?.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Time</span>
                  <span className="text-sm font-medium text-gray-900">{booking.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Location</span>
                  <span className="text-sm font-medium text-gray-900">
                    {locations.find(l => l.id === booking.location)?.name}
                  </span>
                </div>
                <div className="flex justify-between pt-4 border-t border-gray-200">
                  <span className="font-medium text-gray-900">Total Paid</span>
                  <span className="font-bold text-lg text-[#7B2D8E]">{formatCurrency(getFinalPrice())}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard"
                className="flex-1 py-3 bg-[#7B2D8E] text-white rounded-xl font-medium hover:bg-[#6B1D7E] transition-colors"
              >
                View My Bookings
              </Link>
              <button
                onClick={() => {
                  setBookingComplete(false)
                  setStep(1)
                  setBooking({
                    service: null,
                    date: null,
                    time: null,
                    location: locations[0].id,
                    firstName: user?.first_name || '',
                    lastName: user?.last_name || '',
                    email: user?.email || '',
                    phone: user?.phone || '',
                    notes: '',
                    voucherCode: '',
                    voucherDiscount: 0,
                  })
                }}
                className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Book Another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Personalized Welcome Header */}
      <div className="border-b border-gray-100 px-5 sm:px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            {user ? (
              <>
                <h2 className="text-xl font-bold text-gray-900">
                  Welcome back, <span className="text-[#7B2D8E]">{user.first_name}</span>
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">Book your perfect treatment with Dermaspace</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">Dermaspace Booking</h2>
                <p className="text-sm text-gray-500 mt-0.5">Book your perfect treatment</p>
              </>
            )}
          </div>
          
          {/* Desktop Step Indicator */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { num: 1, label: 'Service' },
              { num: 2, label: 'Schedule' },
              { num: 3, label: 'Details' },
              { num: 4, label: 'Confirm' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                    step >= s.num 
                      ? 'bg-[#7B2D8E] text-white shadow-md shadow-[#7B2D8E]/20' 
                      : 'bg-gray-100 text-gray-400'
                  )}>
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={cn(
                    'text-xs mt-1.5 font-medium',
                    step >= s.num ? 'text-[#7B2D8E]' : 'text-gray-400'
                  )}>
                    {s.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div className={cn(
                    'w-12 h-0.5 mx-2 rounded-full transition-colors',
                    step > s.num ? 'bg-[#7B2D8E]' : 'bg-gray-200'
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Mobile Step Indicator */}
        <div className="md:hidden mt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-gray-700">Step {step} of 4</span>
            <span className="text-gray-500">
              {step === 1 ? 'Select Service' : step === 2 ? 'Choose Time' : step === 3 ? 'Your Details' : 'Confirm'}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step 1: Select Service */}
      {step === 1 && (
        <div className="p-5 sm:p-8">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-5 -mx-5 px-5 sm:mx-0 sm:px-0 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  'px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  categoryFilter === cat.id
                    ? 'bg-[#7B2D8E] text-white shadow-md shadow-[#7B2D8E]/20'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] bg-gray-50"
            />
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-1">
            {filteredServices.map(service => (
              <button
                key={service.id}
                onClick={() => setBooking(prev => ({ ...prev, service }))}
                className={cn(
                  'p-5 rounded-2xl border-2 text-left transition-all group',
                  booking.service?.id === service.id
                    ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 shadow-lg shadow-[#7B2D8E]/10'
                    : 'border-gray-100 hover:border-gray-200 hover:shadow-md bg-white'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    {service.is_featured && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 border border-yellow-200">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium text-yellow-700">Popular</span>
                      </span>
                    )}
                  </div>
                  {booking.service?.id === service.id && (
                    <div className="w-6 h-6 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{service.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    {service.duration} min
                  </span>
                  <span className="font-bold text-lg text-[#7B2D8E]">{formatCurrency(service.price)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Next Button */}
          <div className="mt-8 pt-5 border-t border-gray-100">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className={cn(
                'w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-base',
                canProceedToStep2
                  ? 'bg-[#7B2D8E] text-white hover:bg-[#6B1D7E] shadow-lg shadow-[#7B2D8E]/20'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              Continue to Schedule
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Date & Time */}
      {step === 2 && (
        <div className="p-5 sm:p-8">
          {/* Location Selector */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-3">Select Location</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setBooking(prev => ({ ...prev, location: loc.id }))}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    booking.location === loc.id
                      ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 shadow-md'
                      : 'border-gray-100 hover:border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      booking.location === loc.id ? 'bg-[#7B2D8E]' : 'bg-gray-100'
                    )}>
                      <MapPin className={cn('w-5 h-5', booking.location === loc.id ? 'text-white' : 'text-gray-500')} />
                    </div>
                    <span className="font-semibold text-gray-900">{loc.name}</span>
                  </div>
                  <p className="text-sm text-gray-500 ml-13">{loc.address}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Select Date</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm font-semibold w-36 text-center text-gray-700">
                  {selectedMonth.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(selectedMonth).map((date, i) => {
                if (!date) {
                  return <div key={`empty-${i}`} className="aspect-square" />
                }
                const isDisabled = isDateDisabled(date)
                const isSelected = booking.date?.toDateString() === date.toDateString()
                const isToday = date.toDateString() === new Date().toDateString()

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => !isDisabled && handleDateSelect(date)}
                    disabled={isDisabled}
                    className={cn(
                      'aspect-square rounded-xl text-sm font-medium transition-all',
                      isDisabled && 'text-gray-300 cursor-not-allowed',
                      isSelected && 'bg-[#7B2D8E] text-white shadow-md shadow-[#7B2D8E]/20',
                      !isSelected && !isDisabled && 'hover:bg-gray-100',
                      isToday && !isSelected && 'ring-2 ring-[#7B2D8E]/30 font-bold'
                    )}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Slots */}
          {booking.date && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Available Times</h3>
              {timeSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
                  {timeSlots.map(slot => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setBooking(prev => ({ ...prev, time: slot.time }))}
                      disabled={!slot.available}
                      className={cn(
                        'py-3 px-4 rounded-xl text-sm font-semibold transition-all',
                        !slot.available && 'bg-gray-50 text-gray-300 cursor-not-allowed line-through',
                        slot.available && booking.time === slot.time && 'bg-[#7B2D8E] text-white shadow-md shadow-[#7B2D8E]/20',
                        slot.available && booking.time !== slot.time && 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-xl">No available times for this date</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 pt-5 border-t border-gray-100">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedToStep3}
              className={cn(
                'flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all',
                canProceedToStep3
                  ? 'bg-[#7B2D8E] text-white hover:bg-[#6B1D7E] shadow-lg shadow-[#7B2D8E]/20'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Your Details */}
      {step === 3 && (
        <div className="p-5 sm:p-8">
          {user && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Logged in as {user.first_name} {user.last_name}</p>
                <p className="text-xs text-green-600">Your details have been pre-filled</p>
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">First Name *</label>
                <input
                  type="text"
                  value={booking.firstName}
                  onChange={(e) => setBooking(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] bg-gray-50"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Last Name *</label>
                <input
                  type="text"
                  value={booking.lastName}
                  onChange={(e) => setBooking(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] bg-gray-50"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address *</label>
              <input
                type="email"
                value={booking.email}
                onChange={(e) => setBooking(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] bg-gray-50"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number *</label>
              <input
                type="tel"
                value={booking.phone}
                onChange={(e) => setBooking(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] bg-gray-50"
                placeholder="+234 800 000 0000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Special Requests (Optional)</label>
              <textarea
                value={booking.notes}
                onChange={(e) => setBooking(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none bg-gray-50"
                placeholder="Any allergies, preferences, or special requests..."
              />
            </div>

            {/* Voucher Code */}
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                <Gift className="w-4 h-4 inline mr-2 text-[#7B2D8E]" />
                Have a Voucher Code?
              </label>
              {booking.voucherDiscount > 0 ? (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-green-800">{booking.voucherCode.toUpperCase()}</span>
                      <p className="text-xs text-green-600">{booking.voucherDiscount}% discount applied</p>
                    </div>
                  </div>
                  <button onClick={removeVoucher} className="p-2 hover:bg-green-100 rounded-lg text-green-600 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={booking.voucherCode}
                    onChange={(e) => setBooking(prev => ({ ...prev, voucherCode: e.target.value }))}
                    className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] bg-gray-50"
                    placeholder="Enter voucher code"
                  />
                  <button
                    onClick={applyVoucher}
                    disabled={isApplyingVoucher || !booking.voucherCode.trim()}
                    className="px-6 py-3.5 bg-[#7B2D8E] text-white rounded-xl font-semibold hover:bg-[#6B1D7E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApplyingVoucher ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply'}
                  </button>
                </div>
              )}
              {voucherError && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {voucherError}
                </p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 mt-8 pt-5 border-t border-gray-100">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={handleProceedToReview}
              disabled={!canProceedToStep4}
              className={cn(
                'flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all',
                canProceedToStep4
                  ? 'bg-[#7B2D8E] text-white hover:bg-[#6B1D7E] shadow-lg shadow-[#7B2D8E]/20'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              Review Booking
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="p-5 sm:p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Review Your Booking</h3>
          
          <div className="bg-gray-50 rounded-2xl p-5 sm:p-6 mb-6 space-y-5">
            <div className="flex items-start gap-4 pb-5 border-b border-gray-200">
              <div className="w-12 h-12 rounded-xl bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">{booking.service?.name}</p>
                <p className="text-sm text-gray-500">{booking.service?.duration} minutes treatment</p>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-5 border-b border-gray-200">
              <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {booking.date?.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-500">{booking.time}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-5 border-b border-gray-200">
              <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {locations.find(l => l.id === booking.location)?.name}
                </p>
                <p className="text-sm text-gray-500">
                  {locations.find(l => l.id === booking.location)?.address}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{booking.firstName} {booking.lastName}</p>
                <p className="text-sm text-gray-500">{booking.email}</p>
                <p className="text-sm text-gray-500">{booking.phone}</p>
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 sm:p-6 mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">Payment Summary</h4>
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">Service Price</span>
              <span className="text-gray-900 font-medium">{formatCurrency(booking.service?.price || 0)}</span>
            </div>
            {booking.voucherDiscount > 0 && (
              <div className="flex justify-between mb-3 text-green-600">
                <span className="flex items-center gap-1">
                  <Gift className="w-4 h-4" />
                  Voucher Discount ({booking.voucherDiscount}%)
                </span>
                <span>-{formatCurrency((booking.service?.price || 0) * booking.voucherDiscount / 100)}</span>
              </div>
            )}
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <span className="font-bold text-gray-900 text-lg">Total</span>
              <span className="font-bold text-2xl text-[#7B2D8E]">{formatCurrency(getFinalPrice())}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6 text-center">
            By confirming this booking, you agree to our terms of service and cancellation policy. 
            A confirmation email will be sent to {booking.email}.
          </p>

          {/* Navigation */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-[#7B2D8E] text-white rounded-xl font-semibold hover:bg-[#6B1D7E] transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-[#7B2D8E]/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  Confirm Booking
                  <Check className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
