'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Phone, Clock, ArrowRight, Navigation } from 'lucide-react'

const locations = [
  {
    id: 'vi',
    name: 'Victoria Island',
    address: '237b Muri Okunola Street, Victoria Island, Lagos',
    phone: '+234 901 797 2919',
    hours: 'Mon - Sat: 9am - 7pm',
    mapUrl: 'https://maps.google.com/maps?q=6.4281,3.4219',
    coords: { x: 52, y: 58 }
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    address: '44A, Awolowo Road, Ikoyi, Lagos',
    phone: '+234 816 776 4757',
    hours: 'Mon - Sat: 9am - 7pm',
    mapUrl: 'https://maps.google.com/maps?q=6.4461,3.4384',
    coords: { x: 62, y: 48 }
  }
]

export default function LocationsSection() {
  const [activeLocation, setActiveLocation] = useState(locations[0])

  return (
    <section className="py-16 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Our Locations</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Visit <span className="text-[#7B2D8E]">Us</span>
          </h2>
          <div className="flex items-center justify-center gap-1 mt-4">
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
            <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Interactive Map */}
          <div className="relative bg-white rounded-2xl p-6 border border-gray-100 aspect-square max-w-md mx-auto w-full">
            {/* Stylized Lagos Map */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Background */}
              <rect width="100" height="100" fill="#f8f5fa" rx="8"/>
              
              {/* Water/Lagos Lagoon */}
              <path 
                d="M0 60 Q20 55 40 58 Q60 62 80 55 Q90 52 100 56 L100 100 L0 100 Z" 
                fill="#e8e4f0"
                opacity="0.5"
              />
              
              {/* Roads - animated dashed lines */}
              <path 
                d="M10 50 Q30 45 50 50 Q70 55 90 50" 
                stroke="#7B2D8E" 
                strokeWidth="0.8" 
                strokeDasharray="3 2"
                fill="none"
                opacity="0.3"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="10" dur="2s" repeatCount="indefinite"/>
              </path>
              <path 
                d="M50 20 L50 80" 
                stroke="#7B2D8E" 
                strokeWidth="0.8" 
                strokeDasharray="3 2"
                fill="none"
                opacity="0.3"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="10" dur="2s" repeatCount="indefinite"/>
              </path>
              
              {/* Location Markers */}
              {locations.map((loc) => (
                <g key={loc.id} className="cursor-pointer" onClick={() => setActiveLocation(loc)}>
                  {/* Pulse animation */}
                  <circle 
                    cx={loc.coords.x} 
                    cy={loc.coords.y} 
                    r={activeLocation.id === loc.id ? 12 : 8}
                    fill="#7B2D8E"
                    opacity={activeLocation.id === loc.id ? 0.15 : 0.1}
                  >
                    <animate 
                      attributeName="r" 
                      values={activeLocation.id === loc.id ? "12;16;12" : "8;10;8"} 
                      dur="2s" 
                      repeatCount="indefinite"
                    />
                    <animate 
                      attributeName="opacity" 
                      values={activeLocation.id === loc.id ? "0.2;0.05;0.2" : "0.1;0.05;0.1"} 
                      dur="2s" 
                      repeatCount="indefinite"
                    />
                  </circle>
                  
                  {/* Marker */}
                  <circle 
                    cx={loc.coords.x} 
                    cy={loc.coords.y} 
                    r={activeLocation.id === loc.id ? 5 : 3.5}
                    fill="#7B2D8E"
                    className="transition-all duration-300"
                  />
                  
                  {/* Label */}
                  <text 
                    x={loc.coords.x} 
                    y={loc.coords.y - 10} 
                    textAnchor="middle" 
                    className="text-[5px] font-semibold fill-[#7B2D8E]"
                  >
                    {loc.name}
                  </text>
                </g>
              ))}
              
              {/* Lagos Label */}
              <text x="50" y="90" textAnchor="middle" className="text-[4px] fill-gray-400 uppercase tracking-widest">
                Lagos, Nigeria
              </text>
            </svg>
          </div>

          {/* Location Cards */}
          <div className="space-y-4">
            {locations.map((loc) => (
              <div
                key={loc.id}
                onClick={() => setActiveLocation(loc)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  activeLocation.id === loc.id
                    ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    activeLocation.id === loc.id ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">{loc.name}</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#7B2D8E]" />
                        {loc.address}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#7B2D8E]" />
                        {loc.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                        {loc.hours}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-4">
                      <a
                        href={loc.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white text-xs font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Get Directions
                      </a>
                      <Link
                        href="/consultation"
                        className="inline-flex items-center gap-1 text-xs text-[#7B2D8E] font-medium hover:underline"
                      >
                        Book Here
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
