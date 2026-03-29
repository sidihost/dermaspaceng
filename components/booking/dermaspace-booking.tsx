'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  Calendar, Clock, User, Phone, Mail, MapPin, ChevronRight, ChevronLeft,
  Check, X, Sparkles, Star, Gift, AlertCircle, Loader2
} from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string
  category: string
  price: number
  duration: number
  is_featured: boolean
  image_url?: string
}

interface Category {
  id: string
  name: string
  icon?: string
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
    
    // Random availability but less available for popular times
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
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock voucher validation
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

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate booking reference
    const ref = `DS${Date.now().toString(36).toUpperCase()}`
    setBookingReference(ref)
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

  if (bookingComplete) {
    return (
      <div className={cn('w-full bg-white', className)}>
        <div className="min-h-[600px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-6">
              Your appointment has been successfully booked. We&apos;ve sent a confirmation to your email.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <span className="text-sm text-gray-500">Booking Reference</span>
                <span className="font-mono font-bold text-[#7B2D8E]">{bookingReference}</span>
              </div>
              <div className="space-y-3">
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
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-900">Total</span>
                  <span className="text-sm font-bold text-[#7B2D8E]">{formatCurrency(getFinalPrice())}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                setBookingComplete(false)
                setStep(1)
                setBooking({
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
              }}
              className="w-full py-3 bg-[#7B2D8E] text-white rounded-xl font-medium hover:bg-[#6B1D7E] transition-colors"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full bg-white', className)}>
      {/* Header */}
      <div className="border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Dermaspace Booking</h2>
            <p className="text-sm text-gray-500">Book your perfect treatment</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step >= s ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-400'
                )}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 4 && <div className={cn('w-8 h-0.5', step > s ? 'bg-[#7B2D8E]' : 'bg-gray-200')} />}
              </div>
            ))}
          </div>
        </div>
        
        {/* Mobile Step Indicator */}
        <div className="sm:hidden mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Step {step} of 4</span>
            <span>{step === 1 ? 'Select Service' : step === 2 ? 'Choose Time' : step === 3 ? 'Your Details' : 'Confirm'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-[#7B2D8E] h-1 rounded-full transition-all"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step 1: Select Service */}
      {step === 1 && (
        <div className="p-4 sm:p-6">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  categoryFilter === cat.id
                    ? 'bg-[#7B2D8E] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
            />
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {filteredServices.map(service => (
              <button
                key={service.id}
                onClick={() => setBooking(prev => ({ ...prev, service }))}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all',
                  booking.service?.id === service.id
                    ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 ring-2 ring-[#7B2D8E]/20'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                    {service.is_featured && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  {booking.service?.id === service.id && (
                    <div className="w-5 h-5 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{service.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {service.duration} min
                  </span>
                  <span className="font-bold text-[#7B2D8E]">{formatCurrency(service.price)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Next Button */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className={cn(
                'w-full py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors',
                canProceedToStep2
                  ? 'bg-[#7B2D8E] text-white hover:bg-[#6B1D7E]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Date & Time */}
      {step === 2 && (
        <div className="p-4 sm:p-6">
          {/* Location Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Location</label>
            <div className="grid grid-cols-2 gap-3">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setBooking(prev => ({ ...prev, location: loc.id }))}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    booking.location === loc.id
                      ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                    <span className="font-medium text-gray-900 text-sm">{loc.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">{loc.address}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Select Date</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm font-medium w-32 text-center">
                  {selectedMonth.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
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
                      'aspect-square rounded-lg text-sm font-medium transition-all',
                      isDisabled && 'text-gray-300 cursor-not-allowed',
                      isSelected && 'bg-[#7B2D8E] text-white',
                      !isSelected && !isDisabled && 'hover:bg-gray-100',
                      isToday && !isSelected && 'ring-2 ring-[#7B2D8E]/30'
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
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Available Times</h3>
              {timeSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
                  {timeSlots.map(slot => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setBooking(prev => ({ ...prev, time: slot.time }))}
                      disabled={!slot.available}
                      className={cn(
                        'py-2 px-3 rounded-lg text-sm font-medium transition-all',
                        !slot.available && 'bg-gray-100 text-gray-300 cursor-not-allowed line-through',
                        slot.available && booking.time === slot.time && 'bg-[#7B2D8E] text-white',
                        slot.available && booking.time !== slot.time && 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No available times for this date</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedToStep3}
              className={cn(
                'flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors',
                canProceedToStep3
                  ? 'bg-[#7B2D8E] text-white hover:bg-[#6B1D7E]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Your Details */}
      {step === 3 && (
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={booking.firstName}
                  onChange={(e) => setBooking(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={booking.lastName}
                  onChange={(e) => setBooking(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={booking.email}
                onChange={(e) => setBooking(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                value={booking.phone}
                onChange={(e) => setBooking(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                placeholder="+234 800 000 0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests (Optional)</label>
              <textarea
                value={booking.notes}
                onChange={(e) => setBooking(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                placeholder="Any allergies, preferences, or special requests..."
              />
            </div>

            {/* Voucher Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Gift className="w-4 h-4 inline mr-1 text-[#7B2D8E]" />
                Voucher Code
              </label>
              {booking.voucherDiscount > 0 ? (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      <span className="font-medium">{booking.voucherCode.toUpperCase()}</span> - {booking.voucherDiscount}% off applied!
                    </span>
                  </div>
                  <button onClick={removeVoucher} className="text-green-600 hover:text-green-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={booking.voucherCode}
                    onChange={(e) => setBooking(prev => ({ ...prev, voucherCode: e.target.value }))}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                    placeholder="Enter voucher code"
                  />
                  <button
                    onClick={applyVoucher}
                    disabled={isApplyingVoucher || !booking.voucherCode.trim()}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {isApplyingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
              )}
              {voucherError && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {voucherError}
                </p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!canProceedToStep4}
              className={cn(
                'flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors',
                canProceedToStep4
                  ? 'bg-[#7B2D8E] text-white hover:bg-[#6B1D7E]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              Review Booking
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Review Your Booking</h3>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-4">
            <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{booking.service?.name}</p>
                <p className="text-sm text-gray-500">{booking.service?.duration} minutes</p>
              </div>
            </div>

            <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {booking.date?.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-500">{booking.time}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {locations.find(l => l.id === booking.location)?.name}
                </p>
                <p className="text-sm text-gray-500">
                  {locations.find(l => l.id === booking.location)?.address}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{booking.firstName} {booking.lastName}</p>
                <p className="text-sm text-gray-500">{booking.email}</p>
                <p className="text-sm text-gray-500">{booking.phone}</p>
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Service Price</span>
              <span className="text-gray-900">{formatCurrency(booking.service?.price || 0)}</span>
            </div>
            {booking.voucherDiscount > 0 && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Voucher Discount ({booking.voucherDiscount}%)</span>
                <span>-{formatCurrency((booking.service?.price || 0) * booking.voucherDiscount / 100)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-xl text-[#7B2D8E]">{formatCurrency(getFinalPrice())}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6">
            By confirming this booking, you agree to our terms of service and cancellation policy. 
            A confirmation email will be sent to {booking.email}.
          </p>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#7B2D8E] text-white rounded-xl font-medium hover:bg-[#6B1D7E] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  Confirm Booking
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
