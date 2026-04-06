'use client'

import Link from 'next/link'
import { MapPin, Phone, Clock, Navigation } from 'lucide-react'

// WhatsApp Icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

const locations = [
  {
    id: 'vi',
    name: 'Victoria Island',
    address: '237B Muri Okunola Street, VI, Lagos',
    phone: '+234 906 183 6625',
    whatsapp: '+2349061836625',
    hours: 'Mon - Sat: 9am - 7pm',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.7273!2d3.4219!3d6.4281!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103bf53aec4dd92d%3A0x5e34ff9a25fd9285!2sVictoria%20Island%2C%20Lagos!5e0!3m2!1sen!2sng!4v1',
    directionsUrl: 'https://www.google.com/maps/search/?api=1&query=237B+Muri+Okunola+Street+Victoria+Island+Lagos',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg'
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    address: '44A, Awolowo Road, Ikoyi, Lagos',
    phone: '+234 901 313 4945',
    whatsapp: '+2349013134945',
    hours: 'Mon - Sat: 9am - 7pm',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.5!2d3.4384!3d6.4461!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103bf4cc9b07cf55%3A0x5206f6ad3b94a3e!2sIkoyi%2C%20Lagos!5e0!3m2!1sen!2sng!4v1',
    directionsUrl: 'https://www.google.com/maps/search/?api=1&query=44A+Awolowo+Road+Ikoyi+Lagos',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3360.JPG-bJ57ZV3Wl1GImeuHYSeNTlnS0GUCVs.jpeg'
  }
]

export default function LocationsSection() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Find Us</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            Our <span className="text-[#7B2D8E]">Locations</span>
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Visit us at our premium spa locations in Lagos
          </p>
        </div>

        {/* Location Cards Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Google Maps Embed */}
              <div className="h-36 relative">
                <iframe
                  src={loc.mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Dermaspace ${loc.name} Location`}
                  className="grayscale hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                  <p className="text-xs font-bold text-[#7B2D8E]">{loc.name}</p>
                </div>
              </div>
              
              {/* Location Details */}
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600 leading-tight">{loc.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
                    <a href={`tel:${loc.phone}`} className="text-xs text-gray-600 hover:text-[#7B2D8E]">{loc.phone}</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
                    <p className="text-xs text-gray-600">{loc.hours}</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link
                    href={`https://wa.me/${loc.whatsapp}`}
                    target="_blank"
                    className="flex-1 py-2 text-center text-xs font-semibold text-white bg-[#7B2D8E] rounded-lg hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    Chat
                  </Link>
                  <Link
                    href={loc.directionsUrl}
                    target="_blank"
                    className="flex-1 py-2 text-center text-xs font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-lg hover:bg-[#7B2D8E]/20 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Directions
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
