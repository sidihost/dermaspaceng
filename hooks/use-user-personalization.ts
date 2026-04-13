'use client'

import useSWR from 'swr'
import { getPersonalizedTips, getPersonalizedLaserTips, type SkinTip } from '@/lib/skin-tips'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  avatarUrl?: string
  username?: string
}

interface Preferences {
  skinType: string
  concerns: string[]
  preferredServices: string[]
  preferredLocation: string
  notifications: boolean
}

interface BookingService {
  treatmentId: string
  treatmentName: string
  categoryId: string
  categoryName: string
  duration: number
  price: number
}

interface Booking {
  id: string
  bookingReference: string
  locationName: string
  appointmentDate: string
  appointmentTime: string
  status: string
  totalPrice: number
  services: BookingService[]
}

interface AuthResponse {
  user: User
  preferences: Preferences | null
  welcomeDismissed: boolean
}

interface BookingHistoryResponse {
  bookings: Booking[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 401) {
      return null
    }
    throw new Error('Failed to fetch')
  }
  return res.json()
}

export function useUserPersonalization() {
  const { data: authData, isLoading: authLoading } = useSWR<AuthResponse | null>(
    '/api/auth/me',
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false
    }
  )

  const { data: bookingData, isLoading: bookingsLoading } = useSWR<BookingHistoryResponse | null>(
    authData?.user ? '/api/user/booking-history' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false
    }
  )

  const isLoggedIn = !!authData?.user
  const user = authData?.user || null
  const preferences = authData?.preferences || null
  const recentBookings = bookingData?.bookings || []

  // Get personalized tips based on user preferences
  const skinTips: SkinTip[] = preferences 
    ? getPersonalizedTips(preferences.skinType, preferences.concerns)
    : []

  const laserTips: SkinTip[] = preferences
    ? getPersonalizedLaserTips(preferences.concerns)
    : []

  // Get unique recently booked services for quick rebook
  const recentServices = recentBookings
    .flatMap(booking => booking.services)
    .filter((service, index, self) => 
      index === self.findIndex(s => s.treatmentId === service.treatmentId)
    )
    .slice(0, 3)

  // Get last visit date
  const lastVisitDate = recentBookings.length > 0 
    ? recentBookings.find(b => b.status === 'completed')?.appointmentDate
    : null

  // Generate personalized greeting message
  const getGreetingMessage = (): string => {
    if (!user) return ''
    
    const hour = new Date().getHours()
    let greeting = 'Hello'
    if (hour < 12) greeting = 'Good morning'
    else if (hour < 17) greeting = 'Good afternoon'
    else greeting = 'Good evening'
    
    return `${greeting}, ${user.firstName}!`
  }

  // Generate personalized subtitle based on preferences
  const getPersonalizedSubtitle = (): string => {
    if (!preferences) return 'Expertly crafted treatments to rejuvenate your body and mind'
    
    if (preferences.skinType && preferences.concerns.length > 0) {
      return `Curated treatments for your ${preferences.skinType.toLowerCase()} skin and ${preferences.concerns[0].toLowerCase()} concerns`
    } else if (preferences.skinType) {
      return `Perfect treatments for your ${preferences.skinType.toLowerCase()} skin type`
    } else if (preferences.concerns.length > 0) {
      return `Targeted treatments for your ${preferences.concerns[0].toLowerCase()} concerns`
    }
    
    return 'Personalized treatments selected just for you'
  }

  return {
    isLoggedIn,
    isLoading: authLoading || (isLoggedIn && bookingsLoading),
    user,
    preferences,
    recentBookings,
    recentServices,
    lastVisitDate,
    skinTips,
    laserTips,
    getGreetingMessage,
    getPersonalizedSubtitle
  }
}

export type { User, Preferences, Booking, BookingService, SkinTip }
