'use client'

import Link from 'next/link'
import { History, Calendar, ArrowRight, Clock } from 'lucide-react'
import type { BookingService, Booking } from '@/hooks/use-user-personalization'

interface QuickRebookProps {
  recentServices: BookingService[]
  lastVisitDate?: string | null
  recentBookings: Booking[]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  return `${Math.floor(diffDays / 30)} months ago`
}

function formatPrice(priceInKobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(priceInKobo / 100)
}

export default function QuickRebook({ 
  recentServices, 
  lastVisitDate,
  recentBookings 
}: QuickRebookProps) {
  if (recentServices.length === 0) {
    return null
  }

  return (
    <section className="py-8 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
              <History className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Quick Rebook</span>
            </div>
            {lastVisitDate && (
              <span className="text-xs text-gray-500">
                Last visit: {formatDate(lastVisitDate)}
              </span>
            )}
          </div>
          <Link 
            href="/dashboard?tab=bookings"
            className="text-xs text-[#7B2D8E] hover:underline font-medium"
          >
            View all bookings
          </Link>
        </div>

        {/* Recent Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentServices.map((service, index) => (
            <div 
              key={`${service.treatmentId}-${index}`}
              className="group p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/20 hover:bg-[#7B2D8E]/5 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-[#7B2D8E] transition-colors">
                    {service.treatmentName}
                  </h3>
                  <p className="text-xs text-gray-500">{service.categoryName}</p>
                </div>
                <span className="text-xs font-semibold text-[#7B2D8E]">
                  {formatPrice(service.price)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{service.duration} mins</span>
                </div>
                
                <Link
                  href={`/booking?treatment=${encodeURIComponent(service.treatmentId)}&category=${encodeURIComponent(service.categoryId)}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#7B2D8E] text-white text-xs font-medium rounded-full hover:bg-[#5A1D6A] transition-colors"
                >
                  <Calendar className="w-3 h-3" />
                  Book Again
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Full Bookings Summary */}
        {recentBookings.length > 0 && recentBookings[0].services.length > 1 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-[#7B2D8E]/5 to-transparent rounded-xl border border-[#7B2D8E]/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Your last package: {recentBookings[0].services.length} services
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {recentBookings[0].services.map(s => s.treatmentName).join(', ')}
                </p>
              </div>
              <Link
                href={`/booking?rebook=${recentBookings[0].id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#5A1D6A] transition-colors"
              >
                Rebook Package
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
