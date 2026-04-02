'use client'

import { cn } from '@/lib/utils'
import { Phone, Clock, MapPin } from 'lucide-react'

interface BookingFrameProps {
  className?: string
}

// WhatsApp Icon Component
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

export function BookingFrame({ className }: BookingFrameProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Contact Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-[#7B2D8E]/5 px-5 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-600 text-center">
            Contact us to schedule your appointment
          </p>
        </div>

        {/* Contact Options */}
        <div className="p-4 space-y-3">
          {/* WhatsApp - Primary */}
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-[#25D366] text-white rounded-xl hover:bg-[#20BD5A] transition-colors"
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Book via WhatsApp</p>
              <p className="text-xs text-white/80">Quick response guaranteed</p>
            </div>
          </a>

          {/* Phone Call */}
          <a
            href="tel:+2349017972919"
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900">Call Us</p>
              <p className="text-xs text-gray-500">+234 901 797 2919</p>
            </div>
          </a>
        </div>

        {/* Info Section */}
        <div className="px-4 pb-4 space-y-2">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>Mon - Sat: 9AM - 6PM</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>Abuja, Nigeria</span>
          </div>
        </div>
      </div>
    </div>
  )
}
