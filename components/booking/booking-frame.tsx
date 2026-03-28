import { cn } from '@/lib/utils'
import { Phone, Wrench } from 'lucide-react'

interface BookingFrameProps {
  className?: string
  minHeight?: number
}

// WhatsApp Icon Component - Official WhatsApp Logo
function WhatsAppIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export function BookingFrame({ className, minHeight = 700 }: BookingFrameProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="bg-white overflow-hidden border-y sm:border border-gray-200 sm:rounded-2xl">
        {/* Container */}
        <div className="relative flex items-center justify-center" style={{ minHeight }}>
          {/* Maintenance Message */}
          <div className="text-center px-6 py-16 max-w-md">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7B2D8E]/10 mb-6">
              <Wrench className="w-8 h-8 text-[#7B2D8E]" />
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Booking Under Maintenance
            </h3>

            {/* Description */}
            <p className="text-base text-gray-600 mb-8">
              Our online booking system is currently being updated to serve you better. We'll be back shortly!
            </p>

            {/* Contact Options */}
            <div className="space-y-3">
              <a
                href="tel:+2349017972919"
                className="flex items-center justify-center gap-3 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl hover:bg-[#5A1D6A] transition-colors font-semibold"
              >
                <Phone className="w-5 h-5" />
                Call Us
              </a>
              <a
                href="https://wa.me/+2349013134945"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-6 py-3 border-2 border-[#7B2D8E] text-[#7B2D8E] rounded-xl hover:bg-[#7B2D8E]/5 transition-colors font-semibold"
              >
                <WhatsAppIcon />
                WhatsApp Us
              </a>
            </div>

            {/* Info text */}
            <p className="text-sm text-gray-500 mt-6">
              Reach out via phone or WhatsApp to schedule your appointment
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
