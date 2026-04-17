'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin, Phone, Clock, Navigation, Home, ChevronDown } from 'lucide-react'
import { useUserPersonalization } from '@/hooks/use-user-personalization'

// WhatsApp Icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// Leaflet has no SSR — dynamically import on the client only
const InteractiveMap = dynamic(() => import('./interactive-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-72 rounded-2xl ring-1 ring-gray-200 bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-2 text-[#7B2D8E] text-xs font-medium">
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce" />
        </span>
        Preparing your map
      </div>
    </div>
  ),
})

type BranchId = 'vi' | 'ikoyi'

interface LocationInfo {
  id: BranchId
  name: string
  address: string
  phone: string
  whatsapp: string
  hours: string
  image: string
}

const LOCATIONS: LocationInfo[] = [
  {
    id: 'vi',
    name: 'Victoria Island',
    address: '237B Muri Okunola Street, VI, Lagos',
    phone: '+234 906 183 6625',
    whatsapp: '+2349061836625',
    hours: 'Mon – Sat: 9am – 7pm',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg',
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    address: '44A, Awolowo Road, Ikoyi, Lagos',
    phone: '+234 901 313 4945',
    whatsapp: '+2349013134945',
    hours: 'Mon – Sat: 9am – 7pm',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3360.JPG-bJ57ZV3Wl1GImeuHYSeNTlnS0GUCVs.jpeg',
  },
]

// Map any free-form `preferredLocation` value the user may have stored (either
// the pretty name "Victoria Island" / "Ikoyi" or a slug "vi" / "ikoyi") to a
// canonical branch id.
function toBranchId(value?: string | null): BranchId | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('vi') || v.includes('victoria')) return 'vi'
  if (v.includes('ikoyi')) return 'ikoyi'
  return null
}

export default function LocationsSection() {
  const { preferences, user } = useUserPersonalization()

  // Preferred branch derived from DB preferences; falls back to VI
  const preferredId = toBranchId(preferences?.preferredLocation) ?? null
  const [activeId, setActiveId] = useState<BranchId>(preferredId ?? 'vi')
  const [showOther, setShowOther] = useState(false)

  // Keep activeId in sync if preferences load after first paint
  useEffect(() => {
    if (preferredId) setActiveId(preferredId)
  }, [preferredId])

  const primary = LOCATIONS.find((l) => l.id === activeId) || LOCATIONS[0]
  const other = LOCATIONS.find((l) => l.id !== activeId) || LOCATIONS[1]

  // When the user has a saved preference we show a personalised hero block.
  // Otherwise we show the classic two-up side by side.
  const isPersonalised = Boolean(preferredId)

  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header — matches sibling home sections */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">
              {isPersonalised ? 'Your Home Spa' : 'Find Us'}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 text-balance">
            {isPersonalised ? (
              <>
                Dermaspace <span className="text-[#7B2D8E]">{primary.name}</span>
              </>
            ) : (
              <>
                Our <span className="text-[#7B2D8E]">Locations</span>
              </>
            )}
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto text-pretty">
            {isPersonalised
              ? `${user?.firstName ? user.firstName + ', we' : 'We'}'ve set ${primary.name} as your preferred spa.`
              : 'Visit us at our premium spa locations in Lagos'}
          </p>
        </div>

        {isPersonalised ? (
          <div className="space-y-4">
            {/* Featured — user's preferred branch, compact (matches LocationCard rhythm) */}
            <div className="bg-white rounded-xl border border-[#7B2D8E]/20 overflow-hidden shadow-sm ring-1 ring-[#7B2D8E]/10">
              <div className="grid md:grid-cols-[180px_1fr]">
                {/* Photo — same ~h-36 as default LocationCard */}
                <div className="relative h-36 md:h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primary.image}
                    alt={`Dermaspace ${primary.name} spa`}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7B2D8E] text-white text-[9px] font-semibold uppercase tracking-wider shadow-sm">
                    <Home className="w-2.5 h-2.5" />
                    Your Home Spa
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex flex-col">
                  <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest mb-0.5">
                    Dermaspace
                  </p>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{primary.name}</h3>
                  <ul className="space-y-1.5 mb-3">
                    <li className="flex items-start gap-2 text-xs text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                      <span>{primary.address}</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
                      <a
                        href={`tel:${primary.phone}`}
                        className="hover:text-[#7B2D8E] transition-colors"
                      >
                        {primary.phone}
                      </a>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
                      <span>{primary.hours}</span>
                    </li>
                  </ul>

                  <div className="flex flex-wrap gap-2 mt-auto">
                    <Link
                      href={`https://wa.me/${primary.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#7B2D8E] rounded-lg hover:bg-[#6B2278] transition-colors"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      Chat
                    </Link>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(primary.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-lg hover:bg-[#7B2D8E]/20 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Directions
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Live map — compact height to match other home mockups */}
            <InteractiveMap
              activeBranchId={activeId}
              onSelectBranch={setActiveId}
              height="288px"
            />

            {/* Subtle toggle to reveal the other location */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowOther((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#7B2D8E] transition-colors"
                aria-expanded={showOther}
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showOther ? 'rotate-180' : ''}`}
                />
                {showOther ? `Hide other location` : `Also browse ${other.name}`}
              </button>
            </div>

            {showOther && (
              <div className="pt-1">
                <OtherLocationCard location={other} />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Unpersonalised default: two cards + compact map below */}
            <div className="grid md:grid-cols-2 gap-4">
              {LOCATIONS.map((loc) => (
                <LocationCard key={loc.id} location={loc} />
              ))}
            </div>

            <div className="mt-4">
              <InteractiveMap
                activeBranchId={activeId}
                onSelectBranch={setActiveId}
                height="288px"
              />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

// Default (non-personalised) location card
function LocationCard({ location }: { location: LocationInfo }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-36 relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={location.image}
          alt={`Dermaspace ${location.name} spa`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
          <p className="text-xs font-bold text-[#7B2D8E]">{location.name}</p>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 leading-tight">{location.address}</p>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
            <a href={`tel:${location.phone}`} className="text-xs text-gray-600 hover:text-[#7B2D8E]">
              {location.phone}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
            <p className="text-xs text-gray-600">{location.hours}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`https://wa.me/${location.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 text-center text-xs font-semibold text-white bg-[#7B2D8E] rounded-lg hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-1.5"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
            Chat
          </Link>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 text-center text-xs font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-lg hover:bg-[#7B2D8E]/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5" />
            Directions
          </a>
        </div>
      </div>
    </div>
  )
}

// Compact "other location" card for the expandable section under the map
function OtherLocationCard({ location }: { location: LocationInfo }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={location.image}
        alt={`Dermaspace ${location.name} spa`}
        className="w-16 h-16 rounded-lg object-cover ring-1 ring-gray-200 flex-shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-0.5">
          Other Location
        </p>
        <h4 className="text-sm font-bold text-gray-900 mb-0.5 truncate">{location.name}</h4>
        <p className="text-xs text-gray-500 truncate">{location.address}</p>
      </div>
      <div className="flex flex-col items-stretch gap-1.5 flex-shrink-0">
        <Link
          href={`https://wa.me/${location.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#7B2D8E] rounded-md hover:bg-[#6B2278] transition-colors"
        >
          <WhatsAppIcon className="w-3 h-3" />
          Chat
        </Link>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#7B2D8E] bg-white ring-1 ring-[#7B2D8E]/20 rounded-md hover:bg-[#7B2D8E]/10 transition-colors"
        >
          <Navigation className="w-3 h-3" />
          Directions
        </a>
      </div>
    </div>
  )
}
