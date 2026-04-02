'use client'

import { cn } from '@/lib/utils'
import { Phone, Clock, MapPin, Wrench } from 'lucide-react'

interface BookingCardProps {
  className?: string
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export function BookingCard({ className }: BookingCardProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header - Under Maintenance */}
        <div className="text-center px-6 py-6">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#7B2D8E]/10 mb-4">
            <Wrench className="w-6 h-6 text-[#7B2D8E]" />
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Booking Under Maintenance
          </h3>
          <p className="text-sm text-gray-600">
            Our online booking system is currently being updated. Contact us directly to book your appointment.
          </p>
        </div>

        {/* Contact Options */}
        <div className="px-4 pb-4 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="tel:+2349017972919"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white rounded-full hover:bg-[#5A1D6A] transition-colors font-medium text-sm"
          >
            <Phone className="w-4 h-4" />
            Call Us
          </a>
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-[#7B2D8E] text-[#7B2D8E] rounded-full hover:bg-[#7B2D8E]/5 transition-colors font-medium text-sm"
          >
            <WhatsAppIcon />
            WhatsApp
          </a>
        </div>

        {/* Info Section */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Mon - Sat: 9AM - 6PM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>Abuja, Nigeria</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
