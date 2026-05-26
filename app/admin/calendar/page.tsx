'use client'

/**
 * /admin/calendar — Full calendar view of all client bookings.
 *
 * Shows a month-view calendar with events rendered for each booking.
 * Admins can:
 *   - View all bookings across all clients at a glance
 *   - Filter by location and booking status
 *   - Click any booking to navigate to the receipt or admin detail page
 *   - Navigate months with prev/next buttons
 */

import { useState, useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Clock,
  Users,
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import PageLoader from '@/components/shared/page-loader'

interface Booking {
  id: string
  booking_reference: string
  user_id: string
  customer_name: string
  location_id: string | null
  location_name: string | null
  appointment_date: string // YYYY-MM-DD
  appointment_time: string // HH:MM
  total_duration: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
}

interface Location {
  id: string
  name: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function statusColor(status: Booking['status']): string {
  switch (status) {
    case 'confirmed':
      return 'bg-[#0F8A4D]/10 text-[#0F8A4D]'
    case 'completed':
      return 'bg-gray-100 text-gray-700'
    case 'pending':
      return 'bg-amber-100 text-amber-700'
    case 'cancelled':
      return 'bg-red-100 text-red-700'
    case 'no_show':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function statusLabel(status: Booking['status']): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmed'
    case 'completed':
      return 'Completed'
    case 'pending':
      return 'Pending'
    case 'cancelled':
      return 'Cancelled'
    case 'no_show':
      return 'No Show'
    default:
      return status
  }
}

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  // Fetch all bookings and locations
  const { data: bookingsData, isLoading: bookingsLoading } = useSWR<{
    bookings: Booking[]
  }>('/api/admin/bookings', fetcher, {
    revalidateOnFocus: false,
  })

  const { data: locationsData } = useSWR<{ locations: Location[] }>(
    '/api/bookings/locations',
    fetcher,
    { revalidateOnFocus: false },
  )

  const bookings = bookingsData?.bookings ?? []
  const locations = locationsData?.locations ?? []

  // Filter bookings by date range (current month)
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const apptDate = new Date(`${b.appointment_date}T00:00:00`)
      const inMonth = apptDate >= monthStart && apptDate <= monthEnd

      const locationMatch = !selectedLocation || b.location_id === selectedLocation
      const statusMatch = !selectedStatus || b.status === selectedStatus

      return inMonth && locationMatch && statusMatch
    })
  }, [bookings, monthStart, monthEnd, selectedLocation, selectedStatus])

  // Group bookings by date for quick lookup
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>()
    filteredBookings.forEach((b) => {
      const key = b.appointment_date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    })
    return map
  }, [filteredBookings])

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyStart = Array.from({ length: firstDay }, (_, i) => null)
  const calendarDays = [...emptyStart, ...days]

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const monthName = currentDate.toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  })

  if (bookingsLoading) {
    return <PageLoader label="Loading calendar…" />
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-6 w-6 text-[#7B2D8E]" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Bookings Calendar
              </h1>
            </div>
            <p className="text-gray-600">
              View all client appointments across locations
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Location
              </label>
              <select
                value={selectedLocation ?? ''}
                onChange={(e) => setSelectedLocation(e.target.value || null)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
              >
                <option value="">All locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Status
              </label>
              <select
                value={selectedStatus ?? ''}
                onChange={(e) => setSelectedStatus(e.target.value || null)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={goToToday}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            {/* Month header + navigation */}
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-gray-50 p-4 sm:p-6">
              <button
                onClick={goToPrevMonth}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 min-w-fit">
                {monthName}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-white">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="border-r border-gray-100 p-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dateStr =
                  day &&
                  formatDateKey(
                    new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
                  )
                const dayBookings = day ? bookingsByDate.get(dateStr) || [] : []
                const isToday =
                  day &&
                  formatDateKey(new Date()) === dateStr

                return (
                  <div
                    key={idx}
                    className={`min-h-24 border-r border-b border-gray-100 p-2 last:border-r-0 ${
                      !day ? 'bg-gray-50' : isToday ? 'bg-[#7B2D8E]/[0.03]' : ''
                    }`}
                  >
                    {day && (
                      <>
                        <div
                          className={`text-sm font-semibold mb-1 ${
                            isToday ? 'text-[#7B2D8E]' : 'text-gray-700'
                          }`}
                        >
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayBookings.slice(0, 2).map((booking) => (
                            <Link
                              key={booking.id}
                              href={`/booking/${booking.booking_reference}`}
                              className={`block text-[10px] px-1.5 py-0.5 rounded truncate hover:opacity-80 transition-opacity ${statusColor(
                                booking.status,
                              )}`}
                              title={`${booking.customer_name} - ${booking.appointment_time}`}
                            >
                              {booking.customer_name}
                            </Link>
                          ))}
                          {dayBookings.length > 2 && (
                            <div className="text-[9px] text-gray-500 px-1.5">
                              +{dayBookings.length - 2} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Booking summary */}
          {filteredBookings.length > 0 && (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">
                Bookings this month
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map(
                  (status) => {
                    const count = filteredBookings.filter(
                      (b) => b.status === status,
                    ).length
                    return (
                      <div key={status} className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {count}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {statusLabel(status as Booking['status'])}
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
