'use client'

import useSWR from 'swr'
import { getPersonalizedTips, getPersonalizedLaserTips, type SkinTip } from '@/lib/skin-tips'
import { useAuth } from '@/hooks/use-auth'

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
  // Consume the shared server-bootstrapped auth state directly — 0ms on
  // first paint for signed-in users and zero redundant /api/auth/me 401
  // requests for signed-out visitors.
  const {
    user: authUser,
    preferences: authPreferences,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth()

  const { data: bookingData, isLoading: bookingsLoading } = useSWR<BookingHistoryResponse | null>(
    isAuthenticated && authUser?.id ? '/api/user/booking-history' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  )

  const isLoggedIn = isAuthenticated && !!authUser
  const user: User | null = authUser
    ? {
        id: authUser.id,
        email: authUser.email,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        phone: authUser.phone ?? undefined,
        avatarUrl: authUser.avatarUrl ?? undefined,
        username: authUser.username ?? undefined,
      }
    : null
  const preferences: Preferences | null = authPreferences
    ? {
        skinType: authPreferences.skinType ?? '',
        concerns: Array.isArray(authPreferences.concerns) ? authPreferences.concerns : [],
        preferredServices: Array.isArray(authPreferences.preferredServices)
          ? authPreferences.preferredServices
          : [],
        preferredLocation: authPreferences.preferredLocation ?? '',
        notifications: authPreferences.notifications !== false,
      }
    : null
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
